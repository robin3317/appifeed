// Shared DTOs between the API routes and the client feed components.

export type Visibility = "PUBLIC" | "PRIVATE";

export type FeedAuthor = {
  id: string;
  firstName: string;
  lastName: string;
};

export type FeedPost = {
  id: string;
  text: string;
  imageUrl: string | null;
  visibility: Visibility;
  createdAt: string; // ISO
  author: FeedAuthor;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
};

export type FeedResponse = {
  posts: FeedPost[];
  nextCursor: string | null;
};

export type LikeToggleResponse = {
  likeCount: number;
  likedByMe: boolean;
};

export type LikersResponse = {
  users: FeedAuthor[];
  nextCursor: string | null;
};

export type CommentNode = {
  id: string;
  body: string;
  createdAt: string; // ISO
  author: FeedAuthor;
  likeCount: number;
  likedByMe: boolean;
  parentId: string | null;
  replies: CommentNode[]; // only populated on top-level comments (2 levels)
};

export type CommentsResponse = {
  comments: CommentNode[];
  nextCursor: string | null;
  total: number; // total top-level comments on the post
};
