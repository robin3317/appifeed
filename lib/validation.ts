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

// Only accept image URLs that live on our Vercel Blob store, so a client can't
// make us persist an arbitrary/forged URL (review hardening note).
const blobImageUrl = z
  .url()
  .max(2000)
  .refine((u) => {
    try {
      return new URL(u).hostname.endsWith(".blob.vercel-storage.com");
    } catch {
      return false;
    }
  }, "Image must be an uploaded file");

export const createPostSchema = z.object({
  text: z.string().trim().min(1, "Post text is required").max(5000),
  visibility: z.enum(["PUBLIC", "PRIVATE"]).default("PUBLIC"),
  imageUrl: blobImageUrl.optional(),
});
export type CreatePostInput = z.infer<typeof createPostSchema>;

export const createCommentSchema = z.object({
  body: z.string().trim().min(1, "Comment cannot be empty").max(2000),
  // When present, this is a reply. The API enforces the 2-level cap.
  parentId: z.string().min(1).optional(),
});
export type CreateCommentInput = z.infer<typeof createCommentSchema>;

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
