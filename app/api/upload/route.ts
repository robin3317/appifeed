import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getSessionUser } from "@/lib/session";
import { json, unauthorized } from "@/lib/http";

export const runtime = "nodejs";

// Mints a short-lived client upload token so the browser uploads the image
// DIRECTLY to Vercel Blob (never through this function). That sidesteps the
// ~4.5MB serverless body limit (review 1A) and keeps large images off the
// server. Only authenticated users can get a token, and only images up to 8MB.
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const body = (await req.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/gif",
        ],
        maximumSizeInBytes: 8 * 1024 * 1024,
        addRandomSuffix: true,
      }),
      // Fires after the upload finishes. Nothing to persist here — the client
      // sends the returned URL with the post. (No-op body still required.)
      onUploadCompleted: async () => {},
    });
    return Response.json(result);
  } catch (err) {
    return json({ error: (err as Error).message }, 400);
  }
}
