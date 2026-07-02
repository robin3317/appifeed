import { getSessionUser } from "@/lib/session";
import { addLike, removeLike } from "@/lib/likes";
import { commentLikeTarget } from "@/lib/like-targets";
import { json, unauthorized } from "@/lib/http";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const result = await addLike(commentLikeTarget(id, user.id));
  return result.ok
    ? json({ likeCount: result.likeCount, likedByMe: result.likedByMe })
    : json({ error: result.error }, result.status);
}

export async function DELETE(_req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const result = await removeLike(commentLikeTarget(id, user.id));
  return result.ok
    ? json({ likeCount: result.likeCount, likedByMe: result.likedByMe })
    : json({ error: result.error }, result.status);
}
