import { prisma } from "@/lib/prisma";
import { prismaErrorCode } from "@/lib/db-errors";
import type { Prisma } from "@/lib/generated/prisma/client";

export type LikeToggleResult =
  | { ok: true; likeCount: number; likedByMe: boolean }
  | { ok: false; status: number; error: string };

type Tx = Prisma.TransactionClient;

// A like target abstracts over "post like" vs "comment like": same control flow
// (transactional toggle + denormalized counter + idempotency), different tables.
export type LikeTarget = {
  createLike: (tx: Tx) => Promise<unknown>; // throws P2002 (dup) / P2003 (missing target)
  deleteLike: (tx: Tx) => Promise<number>; // rows removed
  changeCount: (tx: Tx, delta: 1 | -1) => Promise<number>; // returns new count
  readCount: () => Promise<number | null>; // current count, or null if target gone
};

// Like: insert the row and bump the counter in one transaction. A duplicate
// like (P2002) is an idempotent no-op returning the current state.
export async function addLike(t: LikeTarget): Promise<LikeToggleResult> {
  try {
    const likeCount = await prisma.$transaction(async (tx) => {
      await t.createLike(tx);
      return t.changeCount(tx, 1);
    });
    return { ok: true, likeCount, likedByMe: true };
  } catch (err) {
    const code = prismaErrorCode(err);
    if (code === "P2002") {
      return { ok: true, likeCount: (await t.readCount()) ?? 0, likedByMe: true };
    }
    if (code === "P2003" || code === "P2025") {
      return { ok: false, status: 404, error: "Not found" };
    }
    console.error("addLike failed", err);
    return { ok: false, status: 500, error: "Something went wrong" };
  }
}

// Unlike: decrement only when a row was actually removed, so the counter can't
// go negative. Missing target → 404.
export async function removeLike(t: LikeTarget): Promise<LikeToggleResult> {
  try {
    const newCount = await prisma.$transaction(async (tx) => {
      const removed = await t.deleteLike(tx);
      return removed === 0 ? null : t.changeCount(tx, -1);
    });
    if (newCount === null) {
      const current = await t.readCount();
      if (current === null) return { ok: false, status: 404, error: "Not found" };
      return { ok: true, likeCount: current, likedByMe: false };
    }
    return { ok: true, likeCount: newCount, likedByMe: false };
  } catch (err) {
    console.error("removeLike failed", err);
    return { ok: false, status: 500, error: "Something went wrong" };
  }
}
