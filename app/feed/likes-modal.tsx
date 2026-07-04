/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { FeedAuthor, LikersResponse } from "@/lib/types";
import { avatarFor } from "@/lib/avatar";

// Modal listing who liked a post or comment. Fetches the same paginated
// likers endpoint used before; rendered into document.body via a portal so it
// overlays the whole page regardless of parent stacking/overflow.
export function LikesModal({
  endpoint,
  onClose,
}: {
  endpoint: string;
  onClose: () => void;
}) {
  const [users, setUsers] = useState<FeedAuthor[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(endpoint)
      .then((r) => r.json())
      .then((d: LikersResponse) => {
        if (!active) return;
        setUsers(d.users);
        setCursor(d.nextCursor);
      })
      .catch(() => active && setUsers([]));
    return () => {
      active = false;
    };
  }, [endpoint]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function loadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    const sep = endpoint.includes("?") ? "&" : "?";
    const res = await fetch(`${endpoint}${sep}cursor=${encodeURIComponent(cursor)}`);
    setLoadingMore(false);
    if (!res.ok) return;
    const d: LikersResponse = await res.json();
    setUsers((prev) => [...(prev ?? []), ...d.users]);
    setCursor(d.nextCursor);
  }

  // Only rendered on a client interaction (never during SSR), so document.body
  // is always available here.
  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        zIndex: 5000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 12,
          width: "100%",
          maxWidth: 420,
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
          fontFamily: "Poppins, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 20px",
            borderBottom: "1px solid #eee",
          }}
        >
          <h4 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Likes</h4>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ border: "none", background: "none", fontSize: 24, lineHeight: 1, cursor: "pointer", color: "#888" }}
          >
            ×
          </button>
        </div>

        <div style={{ overflowY: "auto", padding: "8px 0" }}>
          {users === null ? (
            <p style={{ padding: 20, color: "#888" }}>Loading…</p>
          ) : users.length === 0 ? (
            <p style={{ padding: 20, color: "#888" }}>No likes yet.</p>
          ) : (
            users.map((u) => (
              <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 20px" }}>
                <img
                  src={avatarFor(u.id)}
                  alt=""
                  style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }}
                />
                <span style={{ fontWeight: 500 }}>
                  {u.firstName} {u.lastName}
                </span>
              </div>
            ))
          )}

          {cursor && (
            <div style={{ textAlign: "center", padding: "8px 0" }}>
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                style={{ border: "none", background: "none", color: "#3b5bdb", cursor: "pointer" }}
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
