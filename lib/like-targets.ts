import { prisma } from "@/lib/prisma";
import type { LikeTarget } from "@/lib/likes";

export function postLikeTarget(postId: string, userId: string): LikeTarget {
  return {
    createLike: (tx) => tx.postLike.create({ data: { postId, userId } }),
    deleteLike: (tx) =>
      tx.postLike.deleteMany({ where: { postId, userId } }).then((r) => r.count),
    changeCount: (tx, delta) =>
      tx.post
        .update({
          where: { id: postId },
          data: { likeCount: { increment: delta } },
          select: { likeCount: true },
        })
        .then((p) => p.likeCount),
    readCount: () =>
      prisma.post
        .findUnique({ where: { id: postId }, select: { likeCount: true } })
        .then((p) => p?.likeCount ?? null),
  };
}

export function commentLikeTarget(commentId: string, userId: string): LikeTarget {
  return {
    createLike: (tx) => tx.commentLike.create({ data: { commentId, userId } }),
    deleteLike: (tx) =>
      tx.commentLike
        .deleteMany({ where: { commentId, userId } })
        .then((r) => r.count),
    changeCount: (tx, delta) =>
      tx.comment
        .update({
          where: { id: commentId },
          data: { likeCount: { increment: delta } },
          select: { likeCount: true },
        })
        .then((c) => c.likeCount),
    readCount: () =>
      prisma.comment
        .findUnique({ where: { id: commentId }, select: { likeCount: true } })
        .then((c) => c?.likeCount ?? null),
  };
}
