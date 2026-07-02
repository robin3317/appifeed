import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { json, unauthorized, notFound, serverError } from "@/lib/http";
import { prismaErrorCode } from "@/lib/db-errors";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

// POST — like a post. The like-row insert and the counter increment happen in
// one transaction so likeCount can never drift from the PostLike rows. A second
// like by the same user hits the unique constraint (P2002) and is a no-op.
export async function POST(_req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id: postId } = await params;

  try {
    const post = await prisma.$transaction(async (tx) => {
      await tx.postLike.create({ data: { postId, userId: user.id } });
      return tx.post.update({
        where: { id: postId },
        data: { likeCount: { increment: 1 } },
        select: { likeCount: true },
      });
    });
    return json({ likeCount: post.likeCount, likedByMe: true });
  } catch (err) {
    const code = prismaErrorCode(err);
    if (code === "P2002") {
      // Already liked — idempotent no-op. Return the current state.
      const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { likeCount: true },
      });
      return json({ likeCount: post?.likeCount ?? 0, likedByMe: true });
    }
    if (code === "P2003" || code === "P2025") {
      return notFound("Post not found"); // FK violation / missing post
    }
    console.error("like failed", err);
    return serverError();
  }
}

// DELETE — unlike. Decrement only when a row was actually removed, so repeated
// unlikes can't drive the counter negative.
export async function DELETE(_req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id: postId } = await params;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const removed = await tx.postLike.deleteMany({
        where: { postId, userId: user.id },
      });
      if (removed.count === 0) {
        const p = await tx.post.findUnique({
          where: { id: postId },
          select: { likeCount: true },
        });
        return { likeCount: p?.likeCount ?? 0, existed: p !== null };
      }
      const p = await tx.post.update({
        where: { id: postId },
        data: { likeCount: { decrement: 1 } },
        select: { likeCount: true },
      });
      return { likeCount: p.likeCount, existed: true };
    });

    if (!result.existed) return notFound("Post not found");
    return json({ likeCount: result.likeCount, likedByMe: false });
  } catch (err) {
    console.error("unlike failed", err);
    return serverError();
  }
}
