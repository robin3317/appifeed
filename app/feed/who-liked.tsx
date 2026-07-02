"use client";

import { useState, useEffect } from "react";
import type { FeedAuthor, LikersResponse } from "@/lib/types";

// Reusable "who liked" list. Works for posts and comments via the endpoint prop.
export function WhoLiked({ endpoint }: { endpoint: string }) {
  const [users, setUsers] = useState<FeedAuthor[] | null>(null);

  useEffect(() => {
    let active = true;
    fetch(endpoint)
      .then((r) => r.json())
      .then((d: LikersResponse) => active && setUsers(d.users))
      .catch(() => active && setUsers([]));
    return () => {
      active = false;
    };
  }, [endpoint]);

  if (users === null) {
    return <p style={{ fontSize: 13, color: "#888", margin: "6px 0" }}>Loading…</p>;
  }
  if (users.length === 0) {
    return <p style={{ fontSize: 13, color: "#888", margin: "6px 0" }}>No likes yet.</p>;
  }
  return (
    <ul
      style={{
        margin: "6px 0",
        paddingLeft: 18,
        fontSize: 13,
        color: "#555",
        listStyle: "disc",
      }}
    >
      {users.map((u) => (
        <li key={u.id}>
          {u.firstName} {u.lastName}
        </li>
      ))}
    </ul>
  );
}
