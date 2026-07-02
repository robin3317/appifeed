/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from "react";
import type {
  FeedPost,
  FeedResponse,
  Visibility,
  LikeToggleResponse,
  LikersResponse,
  FeedAuthor,
} from "@/lib/types";

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e6e6e6",
  borderRadius: 10,
  padding: 16,
  marginBottom: 16,
};

export default function FeedClient({ initial }: { initial: FeedResponse }) {
  const [posts, setPosts] = useState<FeedPost[]>(initial.posts);
  const [cursor, setCursor] = useState<string | null>(initial.nextCursor);
  const [loadingMore, setLoadingMore] = useState(false);

  async function loadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    const res = await fetch(`/api/posts?cursor=${encodeURIComponent(cursor)}`);
    setLoadingMore(false);
    if (!res.ok) return;
    const data: FeedResponse = await res.json();
    setPosts((prev) => [...prev, ...data.posts]);
    setCursor(data.nextCursor);
  }

  return (
    <div>
      <CreatePostForm onCreated={(p) => setPosts((prev) => [p, ...prev])} />

      {posts.length === 0 ? (
        <p style={{ color: "#888", textAlign: "center", padding: "40px 0" }}>
          No posts yet. Be the first to post something.
        </p>
      ) : (
        posts.map((post) => <PostCard key={post.id} post={post} />)
      )}

      {cursor && (
        <div style={{ textAlign: "center", marginTop: 8 }}>
          <button
            type="button"
            className="_btn1"
            style={{ padding: "8px 24px" }}
            onClick={loadMore}
            disabled={loadingMore}
          >
            {loadingMore ? "Loading..." : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}

function CreatePostForm({
  onCreated,
}: {
  onCreated: (post: FeedPost) => void;
}) {
  const [text, setText] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("PUBLIC");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, visibility }),
    });
    setSubmitting(false);
    if (!res.ok) {
      setError("Could not publish your post. Please try again.");
      return;
    }
    const post: FeedPost = await res.json();
    onCreated(post);
    setText("");
    setVisibility("PUBLIC");
  }

  return (
    <form onSubmit={submit} style={card}>
      <textarea
        className="form-control"
        placeholder="What's on your mind?"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        maxLength={5000}
        style={{ resize: "vertical", width: "100%" }}
      />
      {error && (
        <p role="alert" style={{ color: "#e5484d", marginTop: 8 }}>
          {error}
        </p>
      )}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 12,
          gap: 12,
        }}
      >
        <label style={{ color: "#555", fontSize: 14 }}>
          Visibility{" "}
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as Visibility)}
            style={{ padding: "4px 8px" }}
          >
            <option value="PUBLIC">Public</option>
            <option value="PRIVATE">Private (only me)</option>
          </select>
        </label>
        <button
          type="submit"
          className="_btn1"
          style={{ padding: "8px 24px" }}
          disabled={submitting || !text.trim()}
        >
          {submitting ? "Posting..." : "Post"}
        </button>
      </div>
    </form>
  );
}

function PostCard({ post }: { post: FeedPost }) {
  const author = `${post.author.firstName} ${post.author.lastName}`;
  const when = new Date(post.createdAt).toLocaleString();

  return (
    <article style={card}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 8,
        }}
      >
        <strong>{author}</strong>
        <span style={{ color: "#999", fontSize: 12 }}>
          {post.visibility === "PRIVATE" && (
            <span
              style={{
                marginRight: 8,
                padding: "1px 8px",
                borderRadius: 10,
                background: "#f0f0f0",
                color: "#666",
              }}
            >
              Private
            </span>
          )}
          {when}
        </span>
      </header>

      <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{post.text}</p>

      {post.imageUrl && (
        <img
          src={post.imageUrl}
          alt=""
          style={{ maxWidth: "100%", borderRadius: 8, marginTop: 12 }}
        />
      )}

      <PostActions post={post} />
    </article>
  );
}

function PostActions({ post }: { post: FeedPost }) {
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [likedByMe, setLikedByMe] = useState(post.likedByMe);
  const [busy, setBusy] = useState(false);
  const [showLikers, setShowLikers] = useState(false);

  async function toggleLike() {
    if (busy) return;
    const nextLiked = !likedByMe;
    // Optimistic update.
    setLikedByMe(nextLiked);
    setLikeCount((c) => Math.max(0, c + (nextLiked ? 1 : -1)));
    setBusy(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/like`, {
        method: nextLiked ? "POST" : "DELETE",
      });
      if (!res.ok) throw new Error("request failed");
      const data: LikeToggleResponse = await res.json();
      // Reconcile with the server's authoritative count.
      setLikeCount(data.likeCount);
      setLikedByMe(data.likedByMe);
    } catch {
      // Revert on failure.
      setLikedByMe(!nextLiked);
      setLikeCount((c) => Math.max(0, c + (nextLiked ? -1 : 1)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <footer
        style={{
          marginTop: 12,
          color: "#666",
          fontSize: 14,
          display: "flex",
          gap: 16,
          alignItems: "center",
        }}
      >
        <button
          type="button"
          onClick={toggleLike}
          aria-pressed={likedByMe}
          style={{
            border: "none",
            background: "none",
            cursor: "pointer",
            color: likedByMe ? "#e5484d" : "#666",
            fontSize: 14,
            padding: 0,
          }}
        >
          {likedByMe ? "♥" : "♡"} Like
        </button>
        <button
          type="button"
          onClick={() => setShowLikers((s) => !s)}
          disabled={likeCount === 0}
          style={{
            border: "none",
            background: "none",
            cursor: likeCount === 0 ? "default" : "pointer",
            color: "#666",
            padding: 0,
          }}
        >
          {likeCount} {likeCount === 1 ? "like" : "likes"}
        </button>
        <span>
          {post.commentCount}{" "}
          {post.commentCount === 1 ? "comment" : "comments"}
        </span>
      </footer>

      {showLikers && <WhoLiked postId={post.id} />}
    </>
  );
}

function WhoLiked({ postId }: { postId: string }) {
  const [users, setUsers] = useState<FeedAuthor[] | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/posts/${postId}/likes`)
      .then((r) => r.json())
      .then((d: LikersResponse) => active && setUsers(d.users))
      .catch(() => active && setUsers([]));
    return () => {
      active = false;
    };
  }, [postId]);

  if (users === null) {
    return <p style={{ fontSize: 13, color: "#888", marginTop: 8 }}>Loading…</p>;
  }
  return (
    <ul
      style={{
        marginTop: 8,
        paddingLeft: 16,
        fontSize: 13,
        color: "#555",
        listStyle: "disc",
      }}
    >
      {users.length === 0 ? (
        <li style={{ listStyle: "none", marginLeft: -16 }}>No likes yet.</li>
      ) : (
        users.map((u) => (
          <li key={u.id}>
            {u.firstName} {u.lastName}
          </li>
        ))
      )}
    </ul>
  );
}
