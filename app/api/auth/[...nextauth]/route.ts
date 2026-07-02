import { handlers } from "@/auth";

// Auth.js mounts its sign-in / callback / session endpoints here.
export const runtime = "nodejs";
export const { GET, POST } = handlers;
