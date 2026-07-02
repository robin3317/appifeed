/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { upload } from "@vercel/blob/client";
import type { FeedPost, FeedResponse, Visibility } from "@/lib/types";
import { useLike } from "./use-like";
import { WhoLiked } from "./who-liked";
import CommentThread from "./comment-thread";

const AVATAR = "/assets/images/post_img.png";

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
        <div className="_feed_inner_timeline_post_area _b_radious6 _padd_b24 _padd_t24 _mar_b16">
          <div className="_feed_inner_timeline_content _padd_r24 _padd_l24">
            <p style={{ color: "#888", textAlign: "center" }}>
              No posts yet. Be the first to post something.
            </p>
          </div>
        </div>
      ) : (
        posts.map((post) => <PostCard key={post.id} post={post} />)
      )}

      {cursor && (
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <button
            type="button"
            className="_feed_inner_text_area_btn_link"
            style={{ padding: "10px 28px" }}
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

  async function submit() {
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      let imageUrl: string | undefined;
      if (file) {
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
      onCreated((await res.json()) as FeedPost);
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
    <div className="_feed_inner_text_area _b_radious6 _padd_b24 _padd_t24 _padd_r24 _padd_l24 _mar_b16">
      <div className="_feed_inner_text_area_box">
        <div className="_feed_inner_text_area_box_image">
          <img src="/assets/images/txt_img.png" alt="" className="_txt_img" />
        </div>
        <div className="_feed_inner_text_area_box_form" style={{ flex: 1 }}>
          <textarea
            className="form-control _textarea"
            placeholder="Write something ..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            maxLength={5000}
            style={{ width: "100%", resize: "vertical" }}
          />
        </div>
      </div>

      {file && (
        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
          <img
            src={URL.createObjectURL(file)}
            alt="preview"
            style={{ height: 56, width: 56, objectFit: "cover", borderRadius: 6 }}
          />
          <span style={{ fontSize: 13, color: "#555", flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
            {file.name}
          </span>
          <button type="button" onClick={() => setFile(null)} style={{ border: "none", background: "none", color: "#e5484d", cursor: "pointer" }}>
            Remove
          </button>
        </div>
      )}

      {error && (
        <p role="alert" style={{ color: "#e5484d", marginTop: 8 }}>
          {error}
        </p>
      )}

      <div className="_feed_inner_text_area_bottom" style={{ marginTop: 16 }}>
        <div className="_feed_inner_text_area_item">
          <div className="_feed_inner_text_area_bottom_photo _feed_common">
            <label className="_feed_inner_text_area_bottom_photo_link" style={{ cursor: "pointer" }}>
              <span className="_feed_inner_text_area_bottom_photo_iamge _mar_img" aria-hidden>📷</span>
              Photo
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                style={{ display: "none" }}
              />
            </label>
          </div>
          <div className="_feed_inner_text_area_bottom_video _feed_common">
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as Visibility)}
              style={{ padding: "4px 8px", border: "1px solid #e2e2e2", borderRadius: 6, color: "#666" }}
            >
              <option value="PUBLIC">🌐 Public</option>
              <option value="PRIVATE">🔒 Private</option>
            </select>
          </div>
        </div>
        <div className="_feed_inner_text_area_btn">
          <button
            type="button"
            className="_feed_inner_text_area_btn_link"
            onClick={submit}
            disabled={submitting || !text.trim()}
          >
            <span>{submitting ? "Posting..." : "Post"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function PostCard({ post }: { post: FeedPost }) {
  const author = `${post.author.firstName} ${post.author.lastName}`;
  const when = new Date(post.createdAt).toLocaleString();

  return (
    <div className="_feed_inner_timeline_post_area _b_radious6 _padd_b24 _padd_t24 _mar_b16">
      <div className="_feed_inner_timeline_content _padd_r24 _padd_l24">
        <div className="_feed_inner_timeline_post_top">
          <div className="_feed_inner_timeline_post_box">
            <div className="_feed_inner_timeline_post_box_image">
              <img src={AVATAR} alt="" className="_post_img" />
            </div>
            <div className="_feed_inner_timeline_post_box_txt">
              <h4 className="_feed_inner_timeline_post_box_title">{author}</h4>
              <p className="_feed_inner_timeline_post_box_para">
                {when} . <a href="#0">{post.visibility === "PRIVATE" ? "Private" : "Public"}</a>
              </p>
            </div>
          </div>
        </div>

        <p
          className="_feed_inner_timeline_post_title"
          style={{ whiteSpace: "pre-wrap", fontWeight: 400 }}
        >
          {post.text}
        </p>

        {post.imageUrl && (
          <div className="_feed_inner_timeline_image">
            <img src={post.imageUrl} alt="" className="_time_img" style={{ maxWidth: "100%" }} />
          </div>
        )}
      </div>

      <PostActions post={post} />
    </div>
  );
}

function PostActions({ post }: { post: FeedPost }) {
  const { count: likeCount, liked, toggle } = useLike(
    `/api/posts/${post.id}/like`,
    post.likeCount,
    post.likedByMe,
  );
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [showComments, setShowComments] = useState(false);
  const [showLikers, setShowLikers] = useState(false);

  return (
    <>
      <div className="_feed_inner_timeline_total_reacts _padd_r24 _padd_l24 _mar_b26">
        <div className="_feed_inner_timeline_total_reacts_image">
          <button
            type="button"
            onClick={() => setShowLikers((s) => !s)}
            disabled={likeCount === 0}
            style={{ border: "none", background: "none", cursor: likeCount === 0 ? "default" : "pointer", color: "#666", padding: 0 }}
          >
            {likeCount} {likeCount === 1 ? "like" : "likes"}
          </button>
        </div>
        <div className="_feed_inner_timeline_total_reacts_txt">
          <p className="_feed_inner_timeline_total_reacts_para1">
            <a href="#0" onClick={(e) => { e.preventDefault(); setShowComments((s) => !s); }}>
              <span>{commentCount}</span> {commentCount === 1 ? "Comment" : "Comments"}
            </a>
          </p>
        </div>
      </div>

      {showLikers && (
        <div className="_padd_r24 _padd_l24">
          <WhoLiked endpoint={`/api/posts/${post.id}/likes`} />
        </div>
      )}

      <div className="_feed_inner_timeline_reaction">
        <button
          type="button"
          onClick={toggle}
          aria-pressed={liked}
          className={`_feed_inner_timeline_reaction_emoji _feed_reaction ${liked ? "_feed_reaction_active" : ""}`}
        >
          <span className="_feed_inner_timeline_reaction_link">
            <span style={{ color: liked ? "#e5484d" : undefined }}>{liked ? "♥" : "♡"} Like</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setShowComments((s) => !s)}
          className="_feed_inner_timeline_reaction_comment _feed_reaction"
        >
          <span className="_feed_inner_timeline_reaction_link">
            <span>Comment</span>
          </span>
        </button>
      </div>

      {showComments && (
        <div className="_feed_inner_timeline_cooment_area">
          <CommentThread postId={post.id} onAdded={() => setCommentCount((c) => c + 1)} />
        </div>
      )}
    </>
  );
}
