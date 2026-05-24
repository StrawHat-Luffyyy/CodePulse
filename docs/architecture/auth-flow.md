# Auth Flow — Architecture Documentation

**Location:** `docs/architecture/auth-flow.md`
**Phase:** 2 — GitHub OAuth & Auth System
**Last updated:** Phase 2 completion

---

## Overview

CodePulse uses GitHub OAuth 2.0 (Authorization Code Flow) for authentication.
NextAuth.js handles the OAuth handshake. Our API handles user persistence.

There is no username/password auth. GitHub is the only identity provider.

---

## Sequence Diagram

```
Browser                Next.js (web)           GitHub              API (Hono)         PostgreSQL
   │                        │                     │                    │                   │
   │── GET /login ──────────►│                     │                    │                   │
   │◄── login page ─────────│                     │                    │                   │
   │                        │                     │                    │                   │
   │── click "Continue" ────►│                     │                    │                   │
   │   signIn('github')      │                     │                    │                   │
   │◄── 302 redirect ───────│                     │                    │                   │
   │                        │                     │                    │                   │
   │── GET /oauth/authorize ──────────────────────►│                    │                   │
   │◄── GitHub login page ───────────────────────│                    │                   │
   │                        │                     │                    │                   │
   │── user authorizes ───────────────────────────►│                    │                   │
   │◄── 302 /callback?code=xxx ──────────────────│                    │                   │
   │                        │                     │                    │                   │
   │── GET /api/auth/callback/github ──►│          │                    │                   │
   │                        │── POST /oauth/token ►│                    │                   │
   │                        │◄── { access_token } ─│                    │                   │
   │                        │                     │                    │                   │
   │                        │── POST /api/auth/sync ──────────────────►│                   │
   │                        │   { githubId, username,                  │                   │
   │                        │     email, avatarUrl,                    │── UPSERT users ──►│
   │                        │     accessToken }                        │◄── user row ──────│
   │                        │◄── { userId } ──────────────────────────│                   │
   │                        │                     │                    │                   │
   │                        │── set encrypted session cookie           │                   │
   │◄── 302 /dashboard ─────│                     │                    │                   │
   │                        │                     │                    │                   │
   │── GET /dashboard ──────►│                     │                    │                   │
   │   (middleware checks session)                 │                    │                   │
   │◄── dashboard page ─────│                     │                    │                   │
```

---

## Step-by-Step Breakdown

### Step 1 — User Clicks "Continue with GitHub"

```typescript
signIn('github', { callbackUrl: '/dashboard' })
```

NextAuth redirects the browser to:
```
https://github.com/login/oauth/authorize
  ?client_id=YOUR_CLIENT_ID
  &scope=read:user+user:email+repo
  &state=CSRF_TOKEN          ← NextAuth generates this automatically
  &redirect_uri=http://localhost:3000/api/auth/callback/github
```

**Security note:** The `state` parameter is a random CSRF token. GitHub echoes it back
in the redirect. NextAuth verifies it matches before proceeding. This prevents CSRF
attacks on the OAuth flow.

---

### Step 2 — User Authorizes on GitHub

GitHub shows the permissions screen. User clicks "Authorize".

GitHub redirects to:
```
http://localhost:3000/api/auth/callback/github?code=TEMPORARY_CODE&state=CSRF_TOKEN
```

The `code` is a one-time, short-lived (10 min) authorization code. It is NOT the access token.

---

### Step 3 — NextAuth Exchanges Code for Access Token

This happens **server-side only**. The browser never sees this request.

```
POST https://github.com/login/oauth/access_token
  client_id=YOUR_CLIENT_ID
  client_secret=YOUR_CLIENT_SECRET    ← never exposed to browser
  code=TEMPORARY_CODE
```

GitHub responds with:
```json
{ "access_token": "gho_xxxxxxxxxxxx", "scope": "repo,read:user,user:email" }
```

**Why this matters:** The `client_secret` never leaves your server. The browser only
handles the `code`, which is useless without the secret. This is why OAuth uses a
two-step exchange instead of returning the token directly.

---

### Step 4 — NextAuth Calls Our signIn Callback

```typescript
async signIn({ user, account, profile }) {
  await fetch(`${INTERNAL_API_URL}/api/auth/sync`, {
    method: 'POST',
    body: JSON.stringify({
      githubId: profile.id.toString(),
      username: profile.login,
      email: user.email,
      avatarUrl: user.image,
      accessToken: account.access_token,
    })
  })
  return true  // returning false would block sign-in
}
```

This syncs the user to our PostgreSQL database.

---

### Step 5 — User Sync (Upsert)

The API receives the sync request and runs a Prisma upsert:

```typescript
await db.user.upsert({
  where: { githubId: data.githubId },
  update: { username, email, avatarUrl, accessToken },
  create: { githubId, username, email, avatarUrl, accessToken },
})
```

**Why upsert?** First login creates the row. Every subsequent login updates it
(refreshes the access token, updates any changed profile data). The `githubId`
never changes, so it's the reliable unique key.

---

### Step 6 — Session Cookie Is Set

NextAuth encrypts the session (JWT strategy) and sets an HTTP-only cookie:

```
Set-Cookie: next-auth.session-token=ENCRYPTED_JWT; HttpOnly; SameSite=Lax; Path=/
```

**HTTP-only** means JavaScript cannot read this cookie (`document.cookie` won't show it).
This prevents XSS attacks from stealing sessions.

The JWT contains: `{ githubId, username, accessToken, exp, iat }`

---

### Step 7 — Route Protection via Middleware

Every request to `/dashboard/*` passes through `middleware.ts`:

```typescript
export { default } from 'next-auth/middleware'
export const config = { matcher: ['/dashboard/:path*'] }
```

NextAuth's middleware:
1. Reads the session cookie
2. Decrypts and validates the JWT
3. If valid → allows the request through
4. If missing or expired → redirects to `/login?callbackUrl=ORIGINAL_URL`

This runs on the **edge** (before the page renders), so unauthenticated users
never see any dashboard content.

---

## Token Storage Strategy

| Token | Where Stored | Accessible From | Why |
|-------|-------------|-----------------|-----|
| GitHub access token | PostgreSQL users.accessToken | Server-side API only | Used to call GitHub API on user's behalf |
| NextAuth session JWT | HTTP-only cookie | Server-side only | Session identity |
| GitHub OAuth code | Browser URL (temporary) | Anywhere (1-use, 10min TTL) | Exchanged immediately, never stored |

**What is never stored client-side:** The GitHub access token. The browser only holds
an encrypted session cookie that identifies the user. The actual GitHub token lives
in PostgreSQL and is only read by the API.

---

## Security Properties

| Threat | Mitigation |
|--------|-----------|
| CSRF on OAuth flow | state parameter (NextAuth handles automatically) |
| XSS stealing session | HTTP-only cookie (JS cannot read it) |
| Token theft from localStorage | We don't use localStorage for tokens |
| Fake webhook events | HMAC-SHA256 signature (Phase 3) |
| Replay of OAuth code | Codes are one-time use; GitHub rejects replays |
| Session fixation | NextAuth rotates session on sign-in |

---

## Error Scenarios

| Scenario | What Happens |
|----------|-------------|
| User denies GitHub authorization | GitHub redirects back with ?error=access_denied; NextAuth shows error page |
| GitHub is down during OAuth | Token exchange fails; NextAuth shows "Try again" error; no crash |
| /api/auth/sync fails (API down) | signIn callback throws; NextAuth blocks sign-in and shows error |
| Invalid GITHUB_CLIENT_SECRET | GitHub returns 401 on token exchange; OAuth fails gracefully |
| Expired session cookie | Middleware redirects to /login; user re-authenticates |
| User revokes GitHub OAuth permission | Next API call gets 401; needs re-auth (TODO: handle gracefully) |

---

## What NextAuth Handles Automatically

- CSRF protection (state parameter)
- OAuth code exchange (server-side)
- Session cookie encryption/decryption
- Token storage in the JWT
- Redirect after sign-in (callbackUrl)
- Route protection (middleware)
- Sign-out (cookie clearing)

## What We Handle

- Syncing user to our own PostgreSQL database
- Storing the GitHub access token for API calls
- Type-extending the session to include githubId and username
- Using the token in the API to call GitHub on the user's behalf

---

## Files Involved

```
apps/web/
├── src/
│   ├── app/
│   │   ├── api/auth/[...nextauth]/route.ts   ← NextAuth config, callbacks
│   │   └── login/page.tsx                    ← Login UI
│   ├── middleware.ts                          ← Route protection
│   └── types/next-auth.d.ts                  ← Session type extensions

apps/api/
└── src/
    └── modules/auth/auth.routes.ts            ← POST /api/auth/sync

packages/db/
└── prisma/schema.prisma                       ← User model
```