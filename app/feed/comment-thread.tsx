"use client";

import { useState, useEffect } from "react";
import type { CommentNode, CommentsResponse } from "@/lib/types";
import { LikeControl } from "./like-control";

// Lazy comment thread for one post. Mounted only when the post is expanded
// (review 5A). Fetches its first page on mount; supports "Load more" for
// top-level comments. Replies are 2 levels deep — a reply to a reply is
// re-parented server-side (2A), and the returned node's parentId always points
// at the top-level comment, so we append it there.
export default function CommentThread({
  postId,
  onAdded,
}: {
  postId: string;
  onAdded: () => void;
}) {
  const [comments, setComments] = useState<CommentNode[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`/api/posts/${postId}/comments`)
      .then((r) => r.json())
      .then((d: CommentsResponse) => {
        if (!active) return;
        setComments(d.comments);
        setCursor(d.nextCursor);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [postId]);

  function addNode(node: CommentNode) {
    if (node.parentId === null) {
      setComments((prev) => [node, ...prev]); // new top-level, newest first
    } else {
      setComments((prev) =>
        prev.map((c) =>
          c.id === node.parentId
            ? { ...c, replies: [...c.replies, node] } // reply, chronological
            : c,
        ),
      );
    }
    onAdded();
  }

  async function create(body: string, parentId?: string) {
    const res = await fetch(`/api/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parentId ? { body, parentId } : { body }),
    });
    if (!res.ok) throw new Error("comment failed");
    addNode((await res.json()) as CommentNode);
  }

  async function loadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    const res = await fetch(
      `/api/posts/${postId}/comments?cursor=${encodeURIComponent(cursor)}`,
    );
    setLoadingMore(false);
    if (!res.ok) return;
    const d: CommentsResponse = await res.json();
    setComments((prev) => [...prev, ...d.comments]);
    setCursor(d.nextCursor);
  }

  return (
    <div style={{ marginTop: 12, borderTop: "1px solid #eee", paddingTop: 12 }}>
      <Composer placeholder="Write a comment…" onSubmit={(b) => create(b)} />

      {loading ? (
        <p style={{ color: "#888", fontSize: 13 }}>Loading comments…</p>
      ) : comments.length === 0 ? (
        <p style={{ color: "#888", fontSize: 13 }}>No comments yet.</p>
      ) : (
        comments.map((c) => (
          <CommentItem
            key={c.id}
            comment={c}
            onReply={(body) => create(body, c.id)}
          />
        ))
      )}

      {cursor && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loadingMore}
          style={linkBtn}
        >
          {loadingMore ? "Loading…" : "Load more comments"}
        </button>
      )}
    </div>
  );
}

function CommentItem({
  comment,
  onReply,
}: {
  comment: CommentNode;
  onReply: (body: string) => Promise<void>;
}) {
  const [replying, setReplying] = useState(false);

  return (
    <div style={{ marginBottom: 12 }}>
      <CommentBody node={comment} />
      <div style={{ display: "flex", gap: 12, fontSize: 13, marginTop: 4 }}>
        <LikeControl
          likeEndpoint={`/api/comments/${comment.id}/like`}
          likesEndpoint={`/api/comments/${comment.id}/likes`}
          initialCount={comment.likeCount}
          initialLiked={comment.likedByMe}
        />
        <button type="button" onClick={() => setReplying((s) => !s)} style={linkBtn}>
          Reply
        </button>
      </div>

      {replying && (
        <div style={{ marginTop: 6 }}>
          <Composer
            placeholder={`Reply to ${comment.author.firstName}…`}
            onSubmit={async (b) => {
              await onReply(b);
              setReplying(false);
            }}
          />
        </div>
      )}

      {comment.replies.length > 0 && (
        <div style={{ marginLeft: 20, marginTop: 8, borderLeft: "2px solid #eee", paddingLeft: 12 }}>
          {comment.replies.map((r) => (
            <div key={r.id} style={{ marginBottom: 10 }}>
              <CommentBody node={r} />
              <div style={{ display: "flex", gap: 12, fontSize: 13, marginTop: 4 }}>
                <LikeControl
                  likeEndpoint={`/api/comments/${r.id}/like`}
                  likesEndpoint={`/api/comments/${r.id}/likes`}
                  initialCount={r.likeCount}
                  initialLiked={r.likedByMe}
                />
                {/* Replying to a reply re-parents to this top-level comment (2A). */}
                <ReplyToReply authorName={r.author.firstName} onReply={onReply} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReplyToReply({
  authorName,
  onReply,
}: {
  authorName: string;
  onReply: (body: string) => Promise<void>;
}) {
  const [replying, setReplying] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setReplying((s) => !s)} style={linkBtn}>
        Reply
      </button>
      {replying && (
        <div style={{ marginTop: 6, width: "100%" }}>
          <Composer
            placeholder={`Reply to ${authorName}…`}
            onSubmit={async (b) => {
              await onReply(b);
              setReplying(false);
            }}
          />
        </div>
      )}
    </>
  );
}

function CommentBody({ node }: { node: CommentNode }) {
  const author = `${node.author.firstName} ${node.author.lastName}`;
  return (
    <div>
      <span style={{ fontWeight: 600, fontSize: 14 }}>{author}</span>{" "}
      <span style={{ color: "#999", fontSize: 12 }}>
        {new Date(node.createdAt).toLocaleString()}
      </span>
      <p style={{ margin: "2px 0 0", whiteSpace: "pre-wrap", fontSize: 14 }}>
        {node.body}
      </p>
    </div>
  );
}

function Composer({
  placeholder,
  onSubmit,
}: {
  placeholder: string;
  onSubmit: (body: string) => Promise<void>;
}) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      await onSubmit(trimmed);
      setBody("");
    } catch {
      // keep the text so the user can retry
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", gap: 8, marginBottom: 12 }}>
      <input
        className="form-control"
        placeholder={placeholder}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={2000}
        style={{ flex: 1 }}
      />
      <button
        type="submit"
        className="_btn1"
        style={{ padding: "6px 16px" }}
        disabled={busy || !body.trim()}
      >
        {busy ? "…" : "Send"}
      </button>
    </form>
  );
}

const linkBtn: React.CSSProperties = {
  border: "none",
  background: "none",
  cursor: "pointer",
  color: "#3b5bdb",
  padding: 0,
  fontSize: 13,
};
