import { prisma } from "@/lib/prisma";
import { authorSelect } from "@/lib/feed";
import { prismaErrorCode } from "@/lib/db-errors";
import type { CommentNode, CommentsResponse, FeedAuthor } from "@/lib/types";

export const COMMENTS_PAGE_SIZE = 10;

type CommentRow = {
  id: string;
  body: string;
  createdAt: Date;
  likeCount: number;
  parentId: string | null;
  author: FeedAuthor;
};

function toNode(
  c: CommentRow,
  likedByMe: boolean,
  replies: CommentNode[],
): CommentNode {
  return {
    id: c.id,
    body: c.body,
    createdAt: c.createdAt.toISOString(),
    author: c.author,
    likeCount: c.likeCount,
    likedByMe,
    parentId: c.parentId,
    replies,
  };
}

// One page of a post's comment thread. Top-level comments newest-first (cursor
// paginated); each carries its replies oldest-first (chronological). "likedByMe"
// for every comment AND reply on the page is resolved with a single batched
// query (no N+1). Loaded lazily, only when a post is expanded (review 5A).
export async function getCommentsPage(
  postId: string,
  userId: string,
  cursor?: string | null,
): Promise<CommentsResponse> {
  const rows = await prisma.comment.findMany({
    where: { postId, parentId: null },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: COMMENTS_PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      author: authorSelect,
      replies: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        include: { author: authorSelect },
      },
    },
  });

  const hasMore = rows.length > COMMENTS_PAGE_SIZE;
  const page = hasMore ? rows.slice(0, COMMENTS_PAGE_SIZE) : rows;
  const nextCursor = hasMore ? page[page.length - 1].id : null;

  const ids: string[] = [];
  for (const c of page) {
    ids.push(c.id);
    for (const r of c.replies) ids.push(r.id);
  }

  const likedSet = ids.length
    ? new Set(
        (
          await prisma.commentLike.findMany({
            where: { userId, commentId: { in: ids } },
            select: { commentId: true },
          })
        ).map((l) => l.commentId),
      )
    : new Set<string>();

  const comments = page.map((c) =>
    toNode(
      c,
      likedSet.has(c.id),
      c.replies.map((r) => toNode(r, likedSet.has(r.id), [])),
    ),
  );

  return { comments, nextCursor };
}

export type CreateCommentResult =
  | { ok: true; comment: CommentNode }
  | { ok: false; status: number; error: string };

// Create a comment or reply. Enforces the 2-level rule (review 2A): a reply to a
// top-level comment attaches to it; a reply to a REPLY re-parents to the
// top-level comment and prepends an @mention of the user being replied to (as
// plain text — rendered escaped by React, never as HTML). The insert and the
// post.commentCount increment run in one transaction.
export async function createComment(
  postId: string,
  userId: string,
  body: string,
  parentId?: string,
): Promise<CreateCommentResult> {
  let effectiveParentId: string | null = null;
  let finalBody = body;

  if (parentId) {
    const parent = await prisma.comment.findUnique({
      where: { id: parentId },
      select: {
        id: true,
        postId: true,
        parentId: true,
        author: { select: { firstName: true, lastName: true } },
      },
    });
    if (!parent || parent.postId !== postId) {
      return { ok: false, status: 404, error: "Parent comment not found" };
    }
    if (parent.parentId === null) {
      effectiveParentId = parent.id;
    } else {
      effectiveParentId = parent.parentId;
      finalBody = `@${parent.author.firstName} ${parent.author.lastName} ${body}`;
    }
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      const c = await tx.comment.create({
        data: { postId, authorId: userId, parentId: effectiveParentId, body: finalBody },
        include: { author: authorSelect },
      });
      await tx.post.update({
        where: { id: postId },
        data: { commentCount: { increment: 1 } },
      });
      return c;
    });
    return { ok: true, comment: toNode(created, false, []) };
  } catch (err) {
    const code = prismaErrorCode(err);
    if (code === "P2003" || code === "P2025") {
      return { ok: false, status: 404, error: "Post not found" };
    }
    console.error("createComment failed", err);
    return { ok: false, status: 500, error: "Something went wrong" };
  }
}
