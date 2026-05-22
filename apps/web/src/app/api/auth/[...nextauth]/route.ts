import NextAuth from "next-auth";
import GithubProvider, { type GithubProfile } from "next-auth/providers/github";

const handler = NextAuth({
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
      session.accessToken = token.accessToken;
      session.user.githubId = token.githubId;
      session.user.username = token.username;
      return session;
    },
    async signIn({ user, account, profile }) {
      // Sync to database after successful GitHub OAuth
      const githubProfile = profile as GithubProfile;
      await fetch(`${process.env.INTERNAL_API_URL}/api/auth/sync`, {
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
      return true;
    },
  },
  pages: {
    signIn: "/login",
  },
});

export { handler as GET, handler as POST };
