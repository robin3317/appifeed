"use client";

import { useState } from "react";
import type { LikeToggleResponse } from "@/lib/types";

// Headless like logic (optimistic toggle + server reconcile + revert on error).
// Posts and comments share this but render their own on-design markup.
export function useLike(
  likeEndpoint: string,
  initialCount: number,
  initialLiked: boolean,
) {
  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState(initialLiked);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    const next = !liked;
    setLiked(next);
    setCount((c) => Math.max(0, c + (next ? 1 : -1)));
    setBusy(true);
    try {
      const res = await fetch(likeEndpoint, { method: next ? "POST" : "DELETE" });
      if (!res.ok) throw new Error("request failed");
      const data: LikeToggleResponse = await res.json();
      setCount(data.likeCount);
      setLiked(data.likedByMe);
    } catch {
      setLiked(!next);
      setCount((c) => Math.max(0, c + (next ? -1 : 1)));
    } finally {
      setBusy(false);
    }
  }

  return { count, liked, toggle };
}
