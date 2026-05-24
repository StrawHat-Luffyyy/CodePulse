<div align="center">

<img src="https://img.shields.io/badge/CodePulse-AI%20Code%20Review-6366f1?style=for-the-badge&logo=github&logoColor=white" alt="CodePulse" height="40"/>

# CodePulse

**AI-powered code review that lives inside your GitHub pull requests.**

CodePulse connects to your repositories via GitHub webhooks, analyzes every pull request with GPT-4o, and posts categorized review comments — security vulnerabilities, performance issues, bugs, and maintainability concerns — directly back to your PR. Automatically.

<br/>

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![Hono](https://img.shields.io/badge/Hono-4.0-orange?style=flat-square&logo=hono&logoColor=white)](https://hono.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis&logoColor=white)](https://redis.io/)
[![BullMQ](https://img.shields.io/badge/BullMQ-Queue-red?style=flat-square)](https://bullmq.io/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](./LICENSE)

<br/>

[**Live Demo**](https://codepulse.vercel.app) · [**View on GitHub**](https://github.com/StrawHat-Luffyyy/codepulse) · [**Report a Bug**](https://github.com/StrawHat-Luffyyy/codepulse/issues)

<br/>

> ⚠️ **Note:** This project uses a real OpenAI API key. If you're self-hosting, bring your own key.

</div>

---

## What It Does

When a pull request is opened on a connected repository, CodePulse:

1. **Receives** a GitHub webhook event, verifies its HMAC-SHA256 signature
2. **Enqueues** the job in BullMQ (Redis-backed) for async processing
3. **Fetches** the PR diff from GitHub's API and parses changed files
4. **Reviews** the diff with GPT-4o using structured prompts
5. **Posts** categorized comments (Security · Performance · Bug · Readability) back to the PR
6. **Displays** all reviews in a real-time dashboard with scores and analytics

<br/>

```
GitHub PR opened
      │
      ▼
POST /api/webhooks/github ──── HMAC verify ──── 401 if invalid
      │
      ▼
BullMQ Queue (Redis)   ◄──────────────── 200 OK to GitHub (immediate)
      │
      ▼ (async worker)
Fetch PR diff from GitHub API
      │
      ▼
Parse + truncate diff (token management)
      │
      ▼
GPT-4o structured review (JSON output + Zod validation)
      │
      ▼
Save to PostgreSQL ──── Post comment to GitHub PR
      │
      ▼
Dashboard updated
```

---

## Screenshots

> 

| Dashboard | PR Review | Queue Monitor |
|-----------|-----------|---------------|
| ![Dashboard](./docs/assets/dashboard.png) | ![PR Review](./docs/assets/pr-review.png) | ![BullBoard](./docs/assets/bullboard.png) |

---

## Architecture

```
codepulse/
├── apps/
│   ├── web/                    ← Next.js 14 (App Router) — deployed on Vercel
│   │   ├── src/
│   │   │   ├── app/            ← Routes: /login, /dashboard, /repos
│   │   │   ├── components/     ← Shadcn/UI + custom components
│   │   │   └── lib/            ← API client, TanStack Query setup
│   │   └── package.json
│   │
│   └── api/                    ← Hono backend — deployed on Railway
│       ├── src/
│       │   ├── modules/
│       │   │   ├── auth/       ← GitHub OAuth user sync
│       │   │   ├── repositories/  ← Repo CRUD + webhook registration
│       │   │   ├── webhooks/   ← GitHub event ingestion + HMAC verification
│       │   │   └── reviews/    ← AI orchestration, PR comment posting
│       │   ├── workers/        ← BullMQ job processors
│       │   ├── queues/         ← Queue definitions
│       │   ├── lib/            ← Redis, OpenAI, GitHub API clients
│       │   └── middleware/     ← Auth, rate limiting, error handling, logging
│       └── package.json
│
├── packages/
│   ├── db/                     ← Prisma schema, migrations, generated client
│   ├── types/                  ← Shared TypeScript interfaces
│   └── config/                 ← Zod env validation (shared)
│
├── docker-compose.yml          ← PostgreSQL 16 + Redis 7
├── turbo.json                  ← Turborepo pipeline config
└── package.json                ← pnpm workspaces root
```

### Key Engineering Decisions

<details>
<summary><strong>Why async queue processing? (BullMQ)</strong></summary>

GitHub expects a webhook response within **10 seconds**, or it marks the delivery as failed and retries. LLM API calls take 5–30 seconds. A synchronous approach would timeout on every webhook.

BullMQ decouples ingestion from processing: the webhook handler acknowledges immediately and enqueues the job. A separate worker process handles the actual AI work. This also enables automatic retries with exponential backoff, concurrency control, and job persistence across server restarts.

</details>

<details>
<summary><strong>Why idempotent job IDs?</strong></summary>

GitHub retries failed webhook deliveries. Each delivery has a unique `X-GitHub-Delivery` ID. By using this as the BullMQ `jobId`, duplicate deliveries are silently rejected — the same PR is never reviewed twice for the same event. This is the **idempotency pattern** for at-least-once delivery systems.

</details>

<details>
<summary><strong>Why `timingSafeEqual` for HMAC verification?</strong></summary>

Naive string comparison (`a === b`) short-circuits on the first mismatch, leaking timing information. An attacker can measure response times to deduce how many characters of their forged signature are correct, incrementally building a valid signature. `timingSafeEqual` always takes constant time regardless of where the mismatch occurs, closing this timing oracle.

</details>

<details>
<summary><strong>Why Hono instead of Express?</strong></summary>

Hono is TypeScript-first, edge-compatible, has zero dependencies, and ships with built-in middleware for CORS, rate limiting, and secure headers. It has the same mental model as Express (routes, middleware, context) with a more modern API surface and significantly faster cold starts.

</details>

<details>
<summary><strong>Why structured logging with Pino?</strong></summary>

`console.log` produces unstructured strings that are impossible to query in production log dashboards. Pino outputs JSON: `{"level":"info","requestId":"abc","userId":"123","duration":"142ms"}`. Log aggregation services (Papertrail, Logtail, Datadog) can filter, group, and alert on any field. Pino is also ~10x faster than Winston due to worker-thread serialization.

</details>

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 14 (App Router) | Dashboard UI, OAuth callback |
| **Styling** | Tailwind CSS + Shadcn/UI | Component library |
| **Server State** | TanStack Query | Data fetching, caching, sync |
| **Backend** | Hono + Node.js | REST API, webhook handler |
| **Language** | TypeScript (strict) | End-to-end type safety |
| **ORM** | Prisma + migrations | Type-safe DB access |
| **Database** | PostgreSQL 16 | Primary data store |
| **Queue** | BullMQ | Async job processing |
| **Cache / Broker** | Redis 7 | Queue backend, rate limiting |
| **AI** | OpenAI GPT-4o | Code review generation |
| **Auth** | NextAuth.js (GitHub OAuth) | Authentication |
| **Validation** | Zod | Runtime validation, env config |
| **Logging** | Pino | Structured JSON logging |
| **CI/CD** | GitHub Actions | Lint, type-check, test |
| **Deployment** | Railway + Vercel | Backend + Frontend hosting |

---

## Getting Started

### Prerequisites

- **Node.js** 20+
- **pnpm** 8+
- **Docker** + Docker Compose
- A **GitHub account** (for OAuth App setup)
- An **OpenAI API key**

---

### 1. Clone & Install

```bash
git clone https://github.com/StrawHat-Luffyyy/codepulse.git
cd codepulse
pnpm install
```

---

### 2. Start Infrastructure

```bash
docker-compose up -d
```

This starts:
- **PostgreSQL** on `localhost:5432`
- **Redis** on `localhost:6379`

Verify they're healthy:
```bash
docker-compose ps
# Both services should show "healthy"
```

---

### 3. Configure Environment Variables

**API** — copy and fill in:
```bash
cp .env.example apps/api/.env
```

```env
# apps/api/.env

NODE_ENV=development
PORT=3001
PUBLIC_API_URL=https://your-ngrok-url.ngrok.io   # for local webhook testing

DATABASE_URL=postgresql://codepulse:codepulse_dev@localhost:5432/codepulse
REDIS_URL=redis://localhost:6379

GITHUB_WEBHOOK_SECRET=your_webhook_secret_min_20_chars

OPENAI_API_KEY=sk-...
```

**Web** — copy and fill in:
```bash
cp .env.example apps/web/.env.local
```

```env
# apps/web/.env.local

NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret   # openssl rand -base64 32

GITHUB_CLIENT_ID=your_github_oauth_app_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_app_client_secret

NEXT_PUBLIC_API_URL=http://localhost:3001
INTERNAL_API_URL=http://localhost:3001
```

---

### 4. Set Up GitHub OAuth App

1. Go to **GitHub → Settings → Developer settings → OAuth Apps → New OAuth App**
2. Fill in:
   - **Homepage URL:** `http://localhost:3000`
   - **Authorization callback URL:** `http://localhost:3000/api/auth/callback/github`
3. Copy the **Client ID** and generate a **Client Secret** → paste into `apps/web/.env.local`

---

### 5. Run Database Migrations

```bash
cd packages/db
npx prisma migrate dev --name init
npx prisma generate
```

---

### 6. Start the Development Server

```bash
# From the root — starts both apps simultaneously via Turborepo
pnpm dev
```

| Service | URL |
|---------|-----|
| Web (Next.js) | http://localhost:3000 |
| API (Hono) | http://localhost:3001 |
| API Health | http://localhost:3001/health |
| Queue Dashboard | http://localhost:3001/admin/queues |
| Prisma Studio | `npx prisma studio` → http://localhost:5555 |

---

### 7. Test Webhooks Locally (ngrok)

GitHub webhooks need a public URL. Use ngrok to tunnel to your local API:

```bash
# Install ngrok: https://ngrok.com/download
ngrok http 3001
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`) and set it as `PUBLIC_API_URL` in `apps/api/.env`.

Connect a repository through the dashboard — this registers the webhook on GitHub pointing to your ngrok URL.

---

## How to Test the Full Flow

1. Connect a GitHub repository via the dashboard
2. Open a pull request in that repository (add some intentional bugs for a better demo)
3. Watch the webhook arrive: `docker-compose logs -f` or API logs
4. Check the queue: `http://localhost:3001/admin/queues`
5. Refresh GitHub — the AI review comment should appear on your PR within 30–60 seconds
6. Check the CodePulse dashboard to see the review score and categorized comments

---

## Database Schema

```prisma
User
  ├── id, githubId, username, email, avatarUrl, accessToken
  └── → repositories[]

Repository
  ├── id, githubRepoId, fullName, webhookId, isActive
  └── → pullRequests[]

PullRequest
  ├── id, number, title, author, headSha
  ├── status: PENDING | PROCESSING | COMPLETED | FAILED
  ├── reviewScore: Float
  └── → reviewComments[]

ReviewComment
  ├── id, filePath, lineNumber
  ├── category: SECURITY | PERFORMANCE | BUG | READABILITY | MAINTAINABILITY
  ├── severity: CRITICAL | ERROR | WARNING | INFO
  ├── content, suggestion
  └── githubCommentId (ID of the comment posted to GitHub)
```

---

## API Reference

```
GET    /health                           Health check

POST   /api/auth/sync                    Sync GitHub user to database
GET    /api/repos                        List connected repositories
POST   /api/repos/:fullName/connect      Register webhook + connect repo
DELETE /api/repos/:id/disconnect         Remove webhook + disconnect repo

GET    /api/repos/:id/prs                List PRs for a repository
GET    /api/prs/:id/review               Get full review with comments

POST   /api/webhooks/github              GitHub webhook receiver (HMAC verified)

GET    /admin/queues                     BullBoard queue dashboard
```

---

## CI/CD Pipeline

Every push to `main` runs:

```
push to main
    │
    ├── lint-and-type-check
    │       pnpm lint
    │       pnpm type-check
    │
    ├── test
    │       (PostgreSQL + Redis service containers)
    │       pnpm test
    │
    └── deploy (on success)
            Railway → API + DB + Redis
            Vercel  → Next.js frontend
```

---

## Deployment

### Railway (API + PostgreSQL + Redis)

1. Create a new Railway project
2. Add **PostgreSQL** and **Redis** plugins
3. Connect your GitHub repository
4. Set environment variables in the Railway dashboard
5. Set the start command: `pnpm --filter @codepulse/api start`
6. Railway auto-deploys on every push to `main`

### Vercel (Frontend)

1. Import the repository on [vercel.com](https://vercel.com)
2. Set **Root Directory** to `apps/web`
3. Add environment variables
4. Vercel auto-deploys via the GitHub integration

---

## Project Status

| Milestone | Status |
|-----------|--------|
| Monorepo + Docker setup | ✅ Complete |
| GitHub OAuth + user sync | ✅ Complete |
| Webhook ingestion + HMAC verification | ✅ Complete |
| BullMQ async queue + workers | ✅ Complete |
| PR diff parsing + token management | ✅ Complete |
| GPT-4o review generation | ✅ Complete |
| GitHub PR comment posting | ✅ Complete |
| Dashboard MVP | ✅ Complete |
| Rate limiting + security headers | ✅ Complete |
| CI/CD pipeline | ✅ Complete |
| RAG codebase memory (Pinecone) | 🚧 In Progress |
| Custom rule engine | 📋 Planned |
| Real-time WebSocket updates | 📋 Planned |
| Team analytics | 📋 Planned |

---

## Roadmap

- [ ] **RAG-based codebase memory** — embed past reviews and code patterns in Pinecone; inject relevant context into review prompts for project-aware feedback
- [ ] **Custom rule engine** — define per-repository rules (regex patterns, AI-checked conventions) that run before the main review
- [ ] **Real-time updates** — WebSocket/SSE-based live review status in the dashboard
- [ ] **Team analytics** — score trends over time, most common issue categories, per-author patterns
- [ ] **Slack integration** — post review summaries to a Slack channel
- [ ] **Multi-provider AI** — switch between GPT-4o, Claude, and Gemini per repository

---

## Contributing

Contributions are welcome. Please open an issue before submitting a pull request for significant changes.

```bash
# Create a feature branch
git checkout -b feat/your-feature-name

# Make your changes, then commit with conventional commits
git commit -m "feat(api): add support for gitlab webhooks"

# Push and open a PR — CodePulse will review it automatically
git push origin feat/your-feature-name
```

### Conventional Commit Format

```
feat(scope):     New feature
fix(scope):      Bug fix
refactor(scope): Refactoring without feature/fix
docs(scope):     Documentation only
test(scope):     Tests only
ci(scope):       CI/CD configuration
infra(scope):    Infrastructure changes
```

---

## License

[MIT](./LICENSE) — built as an open-source portfolio project.

---

<div align="center">

Built by [StrawHat-Luffyyy](https://github.com/StrawHat-Luffyyy)

<br/>

*If this project helped you, consider giving it a ⭐*

</div>
