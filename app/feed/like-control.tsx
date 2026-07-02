"use client";

import { useState } from "react";
import type { LikeToggleResponse } from "@/lib/types";
import { WhoLiked } from "./who-liked";

// Optimistic like toggle + expandable who-liked. Shared by posts and comments
// via the two endpoint props.
export function LikeControl({
  likeEndpoint,
  likesEndpoint,
  initialCount,
  initialLiked,
}: {
  likeEndpoint: string; // POST to like, DELETE to unlike
  likesEndpoint: string; // GET who-liked
  initialCount: number;
  initialLiked: boolean;
}) {
  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState(initialLiked);
  const [busy, setBusy] = useState(false);
  const [showLikers, setShowLikers] = useState(false);

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

  return (
    <div>
      <span style={{ display: "inline-flex", gap: 12, alignItems: "center" }}>
        <button
          type="button"
          onClick={toggle}
          aria-pressed={liked}
          style={{
            border: "none",
            background: "none",
            cursor: "pointer",
            color: liked ? "#e5484d" : "#666",
            padding: 0,
            fontSize: "inherit",
          }}
        >
          {liked ? "♥" : "♡"} Like
        </button>
        <button
          type="button"
          onClick={() => setShowLikers((s) => !s)}
          disabled={count === 0}
          style={{
            border: "none",
            background: "none",
            cursor: count === 0 ? "default" : "pointer",
            color: "#666",
            padding: 0,
            fontSize: "inherit",
          }}
        >
          {count} {count === 1 ? "like" : "likes"}
        </button>
      </span>
      {showLikers && <WhoLiked endpoint={likesEndpoint} />}
    </div>
  );
}
