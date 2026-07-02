import { prisma } from "@/lib/prisma";
import { getFeedPage, authorSelect } from "@/lib/feed";
import { getSessionUser } from "@/lib/session";
import { parseJson, createPostSchema } from "@/lib/validation";
import { json, unauthorized } from "@/lib/http";
import type { FeedPost } from "@/lib/types";

export const runtime = "nodejs";

// GET /api/posts?cursor=<postId> — one page of the feed, newest first.
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const cursor = new URL(req.url).searchParams.get("cursor");
  const feed = await getFeedPage(user.id, cursor);
  return json(feed);
}

// POST /api/posts — create a post for the current user.
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const parsed = await parseJson(req, createPostSchema);
  if (!parsed.ok) return parsed.response;

  const { text, visibility, imageUrl } = parsed.data;
  const p = await prisma.post.create({
    data: { authorId: user.id, text, visibility, imageUrl: imageUrl ?? null },
    include: { author: authorSelect },
  });

  const post: FeedPost = {
    id: p.id,
    text: p.text,
    imageUrl: p.imageUrl,
    visibility: p.visibility,
    createdAt: p.createdAt.toISOString(),
    author: p.author,
    likeCount: p.likeCount,
    commentCount: p.commentCount,
    likedByMe: false,
  };
  return json(post, 201);
}
