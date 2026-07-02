import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Next 16 renamed the "middleware" convention to "proxy". Runs on the edge with
// ONLY the edge-safe config; the `authorized` callback in authConfig decides
// allow/redirect, and the matcher scopes it to protected routes.
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/feed/:path*"],
};
