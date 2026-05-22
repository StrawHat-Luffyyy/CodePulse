import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    accessToken: string;
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      githubId: string;
      username: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken: string;
    githubId: string;
    username: string;
  }
}
