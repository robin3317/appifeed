import type { NextAuthConfig } from "next-auth";

// Edge-safe config: NO database imports live here, so it can be used by
// middleware (which runs on the edge). The real Credentials provider (which
// touches Prisma + bcrypt, Node-only) is added in auth.ts.
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    // Route protection for middleware. Returning false on a protected route
    // makes Auth.js redirect to the signIn page.
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isProtected = nextUrl.pathname.startsWith("/feed");
      if (isProtected) return isLoggedIn;
      return true;
    },
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
