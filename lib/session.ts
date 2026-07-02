import { auth } from "@/auth";

// Single accessor for "who is the caller" on the server. API routes and server
// components use this instead of re-deriving the session everywhere.
export async function getSessionUser() {
  const session = await auth();
  return session?.user ?? null;
}
