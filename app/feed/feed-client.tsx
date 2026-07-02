/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { upload } from "@vercel/blob/client";
import type { FeedPost, FeedResponse, Visibility } from "@/lib/types";
import { LikeControl } from "./like-control";
import CommentThread from "./comment-thread";

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

function CreatePostForm({ onCreated }: { onCreated: (post: FeedPost) => void }) {
  const [text, setText] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("PUBLIC");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      let imageUrl: string | undefined;
      if (file) {
        // Direct browser -> Vercel Blob upload via a signed token from /api/upload.
        const blob = await upload(file.name, file, {
          access: "public",
          handleUploadUrl: "/api/upload",
          contentType: file.type,
        });
        imageUrl = blob.url;
      }
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(imageUrl ? { text, visibility, imageUrl } : { text, visibility }),
      });
      if (!res.ok) throw new Error("post failed");
      const post: FeedPost = await res.json();
      onCreated(post);
      setText("");
      setVisibility("PUBLIC");
      setFile(null);
    } catch {
      setError("Could not publish your post. Please try again.");
    } finally {
      setSubmitting(false);
    }
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

      {file && (
        <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
          <img
            src={URL.createObjectURL(file)}
            alt="preview"
            style={{ height: 56, width: 56, objectFit: "cover", borderRadius: 6 }}
          />
          <span style={{ fontSize: 13, color: "#555", flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
            {file.name}
          </span>
          <button
            type="button"
            onClick={() => setFile(null)}
            style={{ border: "none", background: "none", color: "#e5484d", cursor: "pointer" }}
          >
            Remove
          </button>
        </div>
      )}

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
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <label style={{ color: "#555", fontSize: 14, cursor: "pointer" }}>
            📷 Image
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              style={{ display: "none" }}
            />
          </label>
          <label style={{ color: "#555", fontSize: 14 }}>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as Visibility)}
              style={{ padding: "4px 8px" }}
            >
              <option value="PUBLIC">Public</option>
              <option value="PRIVATE">Private (only me)</option>
            </select>
          </label>
        </div>
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
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [showComments, setShowComments] = useState(false);

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
        <LikeControl
          likeEndpoint={`/api/posts/${post.id}/like`}
          likesEndpoint={`/api/posts/${post.id}/likes`}
          initialCount={post.likeCount}
          initialLiked={post.likedByMe}
        />
        <button
          type="button"
          onClick={() => setShowComments((s) => !s)}
          style={{
            border: "none",
            background: "none",
            cursor: "pointer",
            color: "#666",
            padding: 0,
            fontSize: 14,
          }}
        >
          {commentCount} {commentCount === 1 ? "comment" : "comments"}
        </button>
      </footer>

      {showComments && (
        <CommentThread
          postId={post.id}
          onAdded={() => setCommentCount((c) => c + 1)}
        />
      )}
    </>
  );
}
