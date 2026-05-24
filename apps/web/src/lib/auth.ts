import type { AuthOptions } from "next-auth";
import GithubProvider, { type GithubProfile } from "next-auth/providers/github";

export const authOptions: AuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "read:user user:email repo",
        },
      },
    }),
  ],

  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        const githubProfile = profile as GithubProfile;
        token.accessToken = account.access_token ?? "";
        token.githubId = String(githubProfile.id);
        token.username = githubProfile.login ?? "";
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.user.githubId = token.githubId as string;
      session.user.username = token.username as string;
      return session;
    },
    async signIn({ user, account, profile }) {
      // Sync to database after successful GitHub OAuth
      // Gracefully handle API unavailability — do not block login
      try {
        const githubProfile = profile as GithubProfile;
        const apiUrl = process.env.INTERNAL_API_URL ?? "http://localhost:3001";
        const res = await fetch(`${apiUrl}/api/auth/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            githubId: String(githubProfile.id),
            username: githubProfile.login,
            email: user.email,
            avatarUrl: user.image,
            accessToken: account?.access_token,
          }),
        });

        if (!res.ok) {
          const body = await res.text();
          console.error(
            `[NextAuth] /api/auth/sync returned ${res.status}: ${body}`,
          );
          // Still allow sign-in even if sync fails
        }
      } catch (err) {
        // API is down — log and continue so OAuth still works
        console.error("[NextAuth] API sync failed (API may be down):", err);
      }
      return true;
    },
  },

  pages: {
    signIn: "/login",
  },

  secret: process.env.NEXTAUTH_SECRET,
};
