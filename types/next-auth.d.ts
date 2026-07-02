import type { DefaultSession } from "next-auth";

// Add our user id onto the session/user/JWT types.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
  interface User {
    id: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
  }
}
