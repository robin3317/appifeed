import { getCommentsPage, createComment } from "@/lib/comments";
import { getSessionUser } from "@/lib/session";
import { parseJson, createCommentSchema } from "@/lib/validation";
import { json, unauthorized } from "@/lib/http";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

// GET /api/posts/[id]/comments?cursor= — lazy, paginated comment thread.
export async function GET(req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id: postId } = await params;
  const cursor = new URL(req.url).searchParams.get("cursor");

  const page = await getCommentsPage(postId, user.id, cursor);
  return json(page);
}

// POST /api/posts/[id]/comments — create a comment (or a reply if parentId set).
export async function POST(req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id: postId } = await params;

  const parsed = await parseJson(req, createCommentSchema);
  if (!parsed.ok) return parsed.response;

  const result = await createComment(
    postId,
    user.id,
    parsed.data.body,
    parsed.data.parentId,
  );
  if (!result.ok) {
    return json({ error: result.error }, result.status);
  }
  return json(result.comment, 201);
}
