/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect, useRef } from "react";
import { upload } from "@vercel/blob/client";
import type { FeedPost, FeedResponse, Visibility } from "@/lib/types";
import { avatarFor } from "@/lib/avatar";
import { useLike } from "./use-like";
import { LikesModal } from "./likes-modal";
import CommentThread from "./comment-thread";
import { CurrentUserContext, useCurrentUserId } from "./current-user";
import * as I from "./icons";

const html = (s: string) => ({ __html: s });

export default function FeedClient({
  initial,
  currentUserId,
}: {
  initial: FeedResponse;
  currentUserId: string;
}) {
  const [posts, setPosts] = useState<FeedPost[]>(initial.posts);
  const [cursor, setCursor] = useState<string | null>(initial.nextCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  // Infinite scroll: load the next page when the sentinel enters the viewport.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !cursor) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || loadingRef.current || !cursor) return;
        loadingRef.current = true;
        setLoadingMore(true);
        fetch(`/api/posts?cursor=${encodeURIComponent(cursor)}`)
          .then((r) => (r.ok ? r.json() : Promise.reject()))
          .then((data: FeedResponse) => {
            setPosts((prev) => [...prev, ...data.posts]);
            setCursor(data.nextCursor);
          })
          .catch(() => {})
          .finally(() => {
            loadingRef.current = false;
            setLoadingMore(false);
          });
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [cursor]);

  return (
    <CurrentUserContext.Provider value={currentUserId}>
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

      {/* Infinite-scroll sentinel + loading state (replaces the Load more button). */}
      {cursor && (
        <div ref={sentinelRef} style={{ textAlign: "center", padding: "16px 0 32px", color: "#888" }}>
          {loadingMore ? "Loading more…" : ""}
        </div>
      )}
    </CurrentUserContext.Provider>
  );
}

function CreatePostForm({ onCreated }: { onCreated: (post: FeedPost) => void }) {
  const currentUserId = useCurrentUserId();
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
          <img src={avatarFor(currentUserId ?? "me")} alt="" className="_txt_img" />
        </div>
        <div className="form-floating _feed_inner_text_area_box_form" style={{ flex: 1 }}>
          <textarea
            className="form-control _textarea"
            placeholder="Write something ..."
            id="createPostTextarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{ width: "100%", resize: "vertical", height: 54 }}
          />
          <label className="_feed_textarea_label" htmlFor="createPostTextarea">
            Write something ...{" "}
            <span style={{ display: "inline-flex" }} dangerouslySetInnerHTML={html(I.ICON_PENCIL)} />
          </label>
        </div>
      </div>

      {file && (
        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
          <img src={URL.createObjectURL(file)} alt="preview" style={{ height: 56, width: 56, objectFit: "cover", borderRadius: 6 }} />
          <span style={{ fontSize: 13, color: "#555", flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>{file.name}</span>
          <button type="button" onClick={() => setFile(null)} style={{ border: "none", background: "none", color: "#e5484d", cursor: "pointer" }}>Remove</button>
        </div>
      )}
      {error && <p role="alert" style={{ color: "#e5484d", marginTop: 8 }}>{error}</p>}

      <div className="_feed_inner_text_area_bottom">
        <div className="_feed_inner_text_area_item">
          <div className="_feed_inner_text_area_bottom_photo _feed_common">
            <label className="_feed_inner_text_area_bottom_photo_link" style={{ cursor: "pointer" }}>
              <span className="_feed_inner_text_area_bottom_photo_iamge _mar_img" dangerouslySetInnerHTML={html(I.ICON_PHOTO)} />
              Photo
              <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} style={{ display: "none" }} />
            </label>
          </div>
          <div className="_feed_inner_text_area_bottom_video _feed_common">
            <button type="button" className="_feed_inner_text_area_bottom_photo_link">
              <span className="_feed_inner_text_area_bottom_photo_iamge _mar_img" dangerouslySetInnerHTML={html(I.ICON_VIDEO)} />
              Video
            </button>
          </div>
          <div className="_feed_inner_text_area_bottom_event _feed_common">
            <button type="button" className="_feed_inner_text_area_bottom_photo_link">
              <span className="_feed_inner_text_area_bottom_photo_iamge _mar_img" dangerouslySetInnerHTML={html(I.ICON_EVENT)} />
              Event
            </button>
          </div>
          <div className="_feed_inner_text_area_bottom_article _feed_common">
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
          <button type="button" className="_feed_inner_text_area_btn_link" onClick={submit} disabled={submitting || !text.trim()}>
            <span dangerouslySetInnerHTML={html(I.ICON_SEND)} /> <span>{submitting ? "Posting..." : "Post"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function PostCard({ post }: { post: FeedPost }) {
  const author = `${post.author.firstName} ${post.author.lastName}`;
  const when = new Date(post.createdAt).toLocaleString();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  return (
    <div className="_feed_inner_timeline_post_area _b_radious6 _padd_b24 _padd_t24 _mar_b16">
      <div className="_feed_inner_timeline_content _padd_r24 _padd_l24">
        <div className="_feed_inner_timeline_post_top">
          <div className="_feed_inner_timeline_post_box">
            <div className="_feed_inner_timeline_post_box_image">
              <img src={avatarFor(post.author.id)} alt="" className="_post_img" />
            </div>
            <div className="_feed_inner_timeline_post_box_txt">
              <h4 className="_feed_inner_timeline_post_box_title">{author}</h4>
              <p className="_feed_inner_timeline_post_box_para">
                {when} . <a href="#0">{post.visibility === "PRIVATE" ? "Private" : "Public"}</a>
              </p>
            </div>
          </div>
          <div className="_feed_inner_timeline_post_box_dropdown" ref={menuRef}>
            <div className="_feed_timeline_post_dropdown">
              <button
                type="button"
                className="_feed_timeline_post_dropdown_link"
                onClick={() => setMenuOpen((s) => !s)}
                dangerouslySetInnerHTML={html(I.ICON_DOTS)}
              />
            </div>
            <div
              className={`_feed_timeline_dropdown _timeline_dropdown${menuOpen ? " show" : ""}`}
              dangerouslySetInnerHTML={html(I.POST_MENU)}
            />
          </div>
        </div>

        <h4 className="_feed_inner_timeline_post_title" style={{ whiteSpace: "pre-wrap", fontWeight: 400 }}>
          {post.text}
        </h4>

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

function ReactionImages({ count, onClick }: { count: number; onClick: () => void }) {
  const shown = Math.min(count, 5);
  const remaining = count - 5;
  return (
    <div className="_feed_inner_timeline_total_reacts_image" style={{ cursor: "pointer" }} onClick={onClick}>
      {Array.from({ length: shown }, (_, i) => i + 1).map((n) => (
        <img
          key={n}
          src={`/assets/images/react_img${n}.png`}
          alt=""
          className={n === 1 ? "_react_img1" : n >= 3 ? "_react_img _rect_img_mbl_none" : "_react_img"}
        />
      ))}
      {remaining > 0 && <p className="_feed_inner_timeline_total_reacts_para">+{remaining}</p>}
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
        {likeCount > 0 ? (
          <ReactionImages count={likeCount} onClick={() => setShowLikers((s) => !s)} />
        ) : (
          <div />
        )}
        <div className="_feed_inner_timeline_total_reacts_txt">
          <p className="_feed_inner_timeline_total_reacts_para1">
            <a href="#0" onClick={(e) => { e.preventDefault(); setShowLikers((s) => !s); }}>
              <span>{likeCount}</span> {likeCount === 1 ? "Like" : "Likes"}
            </a>
          </p>
          <p className="_feed_inner_timeline_total_reacts_para2">
            <a href="#0" onClick={(e) => { e.preventDefault(); setShowComments((s) => !s); }} style={{ color: "inherit" }}>
              <span>{commentCount}</span> {commentCount === 1 ? "Comment" : "Comments"}
            </a>
          </p>
        </div>
      </div>

      {showLikers && (
        <LikesModal endpoint={`/api/posts/${post.id}/likes`} onClose={() => setShowLikers(false)} />
      )}

      <div className="_feed_inner_timeline_reaction">
        <button
          type="button"
          onClick={toggle}
          aria-pressed={liked}
          className={`_feed_inner_timeline_reaction_emoji _feed_reaction${liked ? " _feed_reaction_active" : ""}`}
        >
          <span className="_feed_inner_timeline_reaction_link">
            <span dangerouslySetInnerHTML={html(I.ICON_HAHA)} /> {liked ? "Liked" : "Like"}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setShowComments((s) => !s)}
          className="_feed_inner_timeline_reaction_comment _feed_reaction"
        >
          <span className="_feed_inner_timeline_reaction_link">
            <span dangerouslySetInnerHTML={html(I.ICON_COMMENT)} /> Comment
          </span>
        </button>
        <button type="button" className="_feed_inner_timeline_reaction_share _feed_reaction">
          <span className="_feed_inner_timeline_reaction_link">
            <span dangerouslySetInnerHTML={html(I.ICON_SHARE)} /> Share
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
