import { z } from "zod";
import { badRequest } from "@/lib/http";

// Normalize (trim + lowercase) before validating the email format so that
// "  Foo@Bar.com " is accepted and stored canonically.
const email = z.string().trim().toLowerCase().pipe(z.email());

export const registerSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(50),
  lastName: z.string().trim().min(1, "Last name is required").max(50),
  email,
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email,
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: Response };

// Single validation primitive for every JSON route: parse the body, run the
// schema, and hand back either typed data or a ready-to-return 400.
export async function parseJson<T>(
  req: Request,
  schema: z.ZodType<T>,
): Promise<ParseResult<T>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { ok: false, response: badRequest("Invalid JSON body") };
  }
  const result = schema.safeParse(body);
  if (!result.success) {
    return {
      ok: false,
      response: badRequest("Validation failed", result.error.issues),
    };
  }
  return { ok: true, data: result.data };
}
