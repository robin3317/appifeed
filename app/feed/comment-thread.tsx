/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from "react";
import type { CommentNode, CommentsResponse } from "@/lib/types";
import { useLike } from "./use-like";
import { WhoLiked } from "./who-liked";

const AVATAR = "/assets/images/comment_img.png";

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
      setComments((prev) => [node, ...prev]);
    } else {
      setComments((prev) =>
        prev.map((c) =>
          c.id === node.parentId
            ? { ...c, replies: [...c.replies, node] }
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
    <>
      <Composer onSubmit={(b) => create(b)} />

      <div className="_timline_comment_main">
        {loading ? (
          <p style={{ color: "#888", fontSize: 13, padding: "0 4px" }}>Loading comments…</p>
        ) : comments.length === 0 ? (
          <p style={{ color: "#888", fontSize: 13, padding: "0 4px" }}>No comments yet.</p>
        ) : (
          comments.map((c) => (
            <CommentItem key={c.id} comment={c} onReply={(body) => create(body, c.id)} />
          ))
        )}

        {cursor && (
          <div className="_previous_comment">
            <button type="button" className="_previous_comment_txt" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? "Loading…" : "View previous comments"}
            </button>
          </div>
        )}
      </div>
    </>
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
    <div className="_comment_main">
      <div className="_comment_image">
        <img src={AVATAR} alt="" className="_comment_img1" />
      </div>
      <div className="_comment_area" style={{ flex: 1 }}>
        <div className="_comment_details">
          <div className="_comment_details_top">
            <div className="_comment_name">
              <h4 className="_comment_name_title">
                {comment.author.firstName} {comment.author.lastName}
              </h4>
            </div>
          </div>
          <div className="_comment_status">
            <p className="_comment_status_text">
              <span style={{ whiteSpace: "pre-wrap" }}>{comment.body}</span>
            </p>
          </div>
          <CommentActions node={comment} onReplyClick={() => setReplying((s) => !s)} />
        </div>

        {replying && (
          <Composer
            placeholder={`Reply to ${comment.author.firstName}…`}
            onSubmit={async (b) => {
              await onReply(b);
              setReplying(false);
            }}
          />
        )}

        {comment.replies.map((r) => (
          <ReplyItem key={r.id} reply={r} onReply={onReply} />
        ))}
      </div>
    </div>
  );
}

function ReplyItem({
  reply,
  onReply,
}: {
  reply: CommentNode;
  onReply: (body: string) => Promise<void>;
}) {
  const [replying, setReplying] = useState(false);

  return (
    <div className="_comment_main" style={{ marginTop: 10 }}>
      <div className="_comment_image">
        <img src={AVATAR} alt="" className="_comment_img1" />
      </div>
      <div className="_comment_area" style={{ flex: 1 }}>
        <div className="_comment_details">
          <div className="_comment_details_top">
            <div className="_comment_name">
              <h4 className="_comment_name_title">
                {reply.author.firstName} {reply.author.lastName}
              </h4>
            </div>
          </div>
          <div className="_comment_status">
            <p className="_comment_status_text">
              <span style={{ whiteSpace: "pre-wrap" }}>{reply.body}</span>
            </p>
          </div>
          <CommentActions node={reply} onReplyClick={() => setReplying((s) => !s)} />
        </div>

        {replying && (
          <Composer
            placeholder={`Reply to ${reply.author.firstName}…`}
            onSubmit={async (b) => {
              await onReply(b);
              setReplying(false);
            }}
          />
        )}
      </div>
    </div>
  );
}

function CommentActions({
  node,
  onReplyClick,
}: {
  node: CommentNode;
  onReplyClick: () => void;
}) {
  const { count, liked, toggle } = useLike(
    `/api/comments/${node.id}/like`,
    node.likeCount,
    node.likedByMe,
  );
  const [showLikers, setShowLikers] = useState(false);
  const when = new Date(node.createdAt).toLocaleDateString();

  return (
    <div className="_comment_reply">
      <div className="_comment_reply_num">
        <ul className="_comment_reply_list">
          <li>
            <button type="button" onClick={toggle} style={replyLink(liked)}>
              {liked ? "Liked" : "Like"}
            </button>
          </li>
          {count > 0 && (
            <li>
              <button type="button" onClick={() => setShowLikers((s) => !s)} style={replyLink(false)}>
                {count}
              </button>
            </li>
          )}
          <li>
            <button type="button" onClick={onReplyClick} style={replyLink(false)}>
              Reply
            </button>
          </li>
          <li>
            <span className="_time_link">.{when}</span>
          </li>
        </ul>
      </div>
      {showLikers && <WhoLiked endpoint={`/api/comments/${node.id}/likes`} />}
    </div>
  );
}

function Composer({
  onSubmit,
  placeholder = "Write a comment",
}: {
  onSubmit: (body: string) => Promise<void>;
  placeholder?: string;
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
      // keep text for retry
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="_feed_inner_comment_box">
      <form className="_feed_inner_comment_box_form" onSubmit={submit}>
        <div className="_feed_inner_comment_box_content">
          <div className="_feed_inner_comment_box_content_image">
            <img src={AVATAR} alt="" className="_comment_img" />
          </div>
          <div className="_feed_inner_comment_box_content_txt" style={{ flex: 1 }}>
            <input
              className="form-control _comment_textarea"
              placeholder={placeholder}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={2000}
              style={{ width: "100%" }}
            />
          </div>
        </div>
        <div className="_feed_inner_comment_box_icon">
          <button
            type="submit"
            className="_feed_inner_comment_box_icon_btn"
            disabled={busy || !body.trim()}
            style={{ color: "#3b5bdb", fontWeight: 600, padding: "0 8px" }}
          >
            {busy ? "…" : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}

function replyLink(active: boolean): React.CSSProperties {
  return {
    border: "none",
    background: "none",
    cursor: "pointer",
    color: active ? "#e5484d" : "#666",
    padding: 0,
    font: "inherit",
  };
}
