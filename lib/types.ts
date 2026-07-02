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
