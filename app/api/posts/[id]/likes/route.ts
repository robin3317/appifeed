import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { authorSelect } from "@/lib/feed";
import { json, unauthorized } from "@/lib/http";
import type { LikersResponse } from "@/lib/types";

export const runtime = "nodejs";

const PAGE_SIZE = 20;

type Params = { params: Promise<{ id: string }> };

// GET /api/posts/[id]/likes?cursor= — who liked this post, newest first,
// cursor-paginated (same keyset pattern as the feed).
export async function GET(req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id: postId } = await params;
  const cursor = new URL(req.url).searchParams.get("cursor");

  const rows = await prisma.postLike.findMany({
    where: { postId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { user: authorSelect },
  });

  const hasMore = rows.length > PAGE_SIZE;
  const page = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  const body: LikersResponse = {
    users: page.map((r) => r.user),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  };
  return json(body);
}
