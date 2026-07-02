import { prisma } from "@/lib/prisma";
import type { FeedPost, FeedResponse } from "@/lib/types";

export const PAGE_SIZE = 10;

// Author fields we expose on a post. Shared so the select stays consistent.
export const authorSelect = {
  select: { id: true, firstName: true, lastName: true },
} as const;

// One page of the feed, newest-first, using cursor (keyset) pagination.
//
// Visibility: a user sees every PUBLIC post plus their own PRIVATE ones.
// Pagination: orderBy (createdAt desc, id desc) backed by the @@index([createdAt, id]);
// the id tiebreaker keeps ordering stable when posts share a timestamp.
// "likedByMe" is resolved with ONE extra query for the whole page (no N+1).
// Comments are NOT loaded here — the feed carries only commentCount, and
// comments are fetched lazily when a post is expanded.
export async function getFeedPage(
  userId: string,
  cursor?: string | null,
): Promise<FeedResponse> {
  const rows = await prisma.post.findMany({
    where: { OR: [{ visibility: "PUBLIC" }, { authorId: userId }] },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: PAGE_SIZE + 1, // fetch one extra to detect a next page
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { author: authorSelect },
  });

  const hasMore = rows.length > PAGE_SIZE;
  const page = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  const nextCursor = hasMore ? page[page.length - 1].id : null;

  const likedSet = page.length
    ? new Set(
        (
          await prisma.postLike.findMany({
            where: { userId, postId: { in: page.map((p) => p.id) } },
            select: { postId: true },
          })
        ).map((l) => l.postId),
      )
    : new Set<string>();

  const posts: FeedPost[] = page.map((p) => ({
    id: p.id,
    text: p.text,
    imageUrl: p.imageUrl,
    visibility: p.visibility,
    createdAt: p.createdAt.toISOString(),
    author: p.author,
    likeCount: p.likeCount,
    commentCount: p.commentCount,
    likedByMe: likedSet.has(p.id),
  }));

  return { posts, nextCursor };
}
