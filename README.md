# Appifeed — Social Feed

A full-stack social feed built for the Appifylab take-home. The provided Buddy
Script HTML/CSS pages (login, register, feed) are rebuilt as a **Next.js**
application with a real backend, database, authentication, and image uploads.

The emphasis is on the backend: a normalized relational schema, secure
auth, and read paths designed to stay fast at scale.

---

## Live demo & walkthrough

- **Live URL:** _add your Vercel URL_
- **Video walkthrough:** _add your unlisted YouTube link_
- **Demo login (after seeding):** `alex0@appifeed.dev` / `password123`

---

## Features

Everything in the task brief is implemented:

- **Auth** — email/password registration (first name, last name, email,
  password), login, logout. Session-backed, JWT in an httpOnly cookie.
- **Protected feed** — only logged-in users can reach `/feed`.
- **Posts** — create with text and/or image; **newest first**; **infinite
  scroll** (cursor pagination).
- **Public / private posts** — private posts are visible only to their author
  (enforced server-side).
- **Likes** — like/unlike posts, correct like state, **who liked** (in a modal).
- **Comments & replies** — 2-level threads; comments load lazily with a
  "view N previous comments" toggle (latest shown first).
- **Comment/reply likes** — like/unlike with who-liked; count shown as a badge.
- **Image upload** — direct browser → Vercel Blob upload (bypasses the
  serverless body-size limit).

---

## Tech stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | **Next.js 16 (App Router)** + React 19 + TypeScript | One codebase for UI + API; server components + route handlers |
| Database | **PostgreSQL** (Neon) | Relational data (posts, nested comments, likes) wants a relational store |
| ORM | **Prisma 7** (pg driver adapter) | Type-safe schema, migrations, and queries |
| Auth | **Auth.js v5** (Credentials + JWT) | Vetted library — don't roll your own session crypto |
| Passwords | **bcryptjs** (cost 12) | Portable hashing (no native build on Windows/Linux) |
| Uploads | **Vercel Blob** | Direct client uploads with a short-lived signed token |
| Validation | **Zod** | One validation layer for every API route |

---

## Architecture

### Data model

Normalized relational model. A **reply is a comment** with a self-referencing
`parentId`; likes live in **per-entity tables** with unique constraints so a
user can't double-like at the database level. `likeCount` / `commentCount` are
**denormalized** and kept in sync inside the same transaction as the write.

```
User ─┬─< Post ─┬─< Comment ──self──< Comment (reply, parentId)
      │         │        └─< CommentLike >── User
      │         └─< PostLike >── User
      └── (author of posts, comments, likes)

Post.visibility: PUBLIC | PRIVATE
Post.likeCount / Post.commentCount     ← denormalized
Comment.likeCount                      ← denormalized
Indexes: Post(createdAt, id) for keyset pagination; Post(authorId);
         Comment(postId, createdAt); Comment(parentId);
         unique(PostLike.postId,userId); unique(CommentLike.commentId,userId)
```

Full schema: [`prisma/schema.prisma`](prisma/schema.prisma).

### Authentication

- **Auth.js v5 Credentials** provider with the **JWT session strategy**; the
  token is stored in an **httpOnly, Secure, SameSite** cookie (never in
  localStorage).
- Config is **split** so the edge middleware never bundles the database client:
  - [`auth.config.ts`](auth.config.ts) — edge-safe (route protection callback),
    used by [`proxy.ts`](proxy.ts) to guard `/feed`.
  - [`auth.ts`](auth.ts) — full config with the Prisma-backed Credentials
    provider (Node runtime only).
- Every API mutation re-checks the session server-side via
  [`lib/session.ts`](lib/session.ts) — the client is never trusted for identity.

### Feed & pagination (the "millions of reads" part)

[`lib/feed.ts`](lib/feed.ts):

- **Cursor (keyset) pagination**, never `OFFSET`: `ORDER BY (createdAt DESC, id
  DESC)` backed by the `@@index([createdAt, id])`. Stays fast at row 1 or row
  1,000,000; the `id` tiebreaker keeps ordering stable when posts share a
  timestamp.
- **Visibility filter** runs in SQL (`PUBLIC OR authorId = me`) — private posts
  are never sent to other users.
- **No N+1:** "liked by me" for a whole page is one batched query
  (`postId IN (...)`), not one query per post. Comments are **not** loaded with
  the feed — each post carries only `commentCount`, and comments load lazily
  when a post is expanded.
- **Denormalized counters** mean the feed never runs `COUNT(*)` per post.

### Comments

[`lib/comments.ts`](lib/comments.ts): 2-level threads. A reply to a top-level
comment attaches to it; a reply to a **reply** re-parents to the top-level
comment and prepends an `@mention` (as plain text, rendered escaped). The insert
and the `commentCount` increment run in one transaction.

### Likes

[`lib/likes.ts`](lib/likes.ts): a shared toggle used by both posts and comments.
The like row and the denormalized counter move together in one transaction; a
duplicate like hits the unique constraint and is an idempotent no-op; unlike
only decrements when a row was actually removed (counter can't go negative).

### Image upload

[`app/api/upload/route.ts`](app/api/upload/route.ts): the browser uploads the
image **directly to Vercel Blob** using a short-lived token minted by the server
(`@vercel/blob` `handleUpload`). This bypasses the ~4.5MB serverless request-body
limit. The post API only accepts image URLs on our Blob domain, so a client
can't make us store an arbitrary URL.

---

## Security

- Passwords hashed with bcrypt (cost 12); never stored in plaintext.
- Session as a JWT in an httpOnly + Secure + SameSite cookie; no tokens in JS.
- Every API mutation verifies the session server-side; users can only act as
  themselves.
- Private-post visibility enforced in SQL, not on the client.
- All request bodies validated with Zod ([`lib/validation.ts`](lib/validation.ts)).
- Prisma parameterizes all queries (no string-built SQL).
- Uploads: image content-types only, 8MB cap, and stored URLs must be on the
  Blob domain.
- User content is rendered as escaped text (React default); `@mentions` are
  plain text, never raw HTML.

_Known tradeoff:_ a private post's **image** lives at a public (unguessable)
Blob URL. The feed API never returns that URL to anyone but the author, so it's
not discoverable in-app; making private-post images fully private would require
private Blob + signed read URLs (documented as future work).

---

## Getting started

### Prerequisites

- Node 18+ and npm
- A PostgreSQL database (a free [Neon](https://neon.tech) project works)
- (Optional, for image uploads) a [Vercel Blob](https://vercel.com/storage/blob)
  store

### 1. Install

```bash
npm install
```

### 2. Environment

Copy `.env.example` to `.env` and fill in:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DB?sslmode=require"
AUTH_SECRET="<run: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\">"
BLOB_READ_WRITE_TOKEN="<from the Vercel Blob store; optional for images>"
```

### 3. Database

```bash
npx prisma migrate dev      # create the schema
npm run seed                # (optional) 25 users, 3000 posts, ~22k likes, comments
```

### 4. Run

```bash
npm run dev                 # http://localhost:3000
```

After seeding, log in with `alex0@appifeed.dev` / `password123` (all seeded
users share that password).

---

## Deployment (Vercel)

1. Push to GitHub and import the repo in Vercel.
2. Set the env vars: `DATABASE_URL`, `AUTH_SECRET`, `BLOB_READ_WRITE_TOKEN`, and
   `AUTH_TRUST_HOST=true` (Auth.js v5 in production).
3. Deploy. Run `npx prisma migrate deploy` against the production database to
   apply the schema.

---

## Project structure

```
app/
  login/, register/               on-design auth pages
  feed/                           feed UI (client components) + static Buddy Script chrome
  api/
    register/                     POST register
    auth/[...nextauth]/           Auth.js handlers
    posts/                        GET feed (cursor) + POST create
    posts/[id]/like, likes        toggle + who-liked
    posts/[id]/comments           list (lazy) + create (2-level rule)
    comments/[id]/like, likes     toggle + who-liked
    upload/                       Vercel Blob client-upload token
lib/
  prisma.ts, feed.ts, comments.ts, likes.ts, like-targets.ts,
  session.ts, validation.ts, http.ts, db-errors.ts, avatar.ts, types.ts
auth.ts, auth.config.ts, proxy.ts   Auth.js + route protection
prisma/schema.prisma, seed.ts
```

---

## Key decisions

- **Next.js full-stack over a separate API:** fewer moving parts, one deploy,
  and the backend logic (schema, queries, auth, pagination) is still hand-written
  in route handlers — not offloaded to a BaaS.
- **Per-entity like tables + denormalized counters** over a polymorphic likes
  table: real foreign keys, DB-level dedupe, and no `COUNT(*)` on reads.
- **Keyset over offset pagination:** the offset approach degrades linearly with
  depth; keyset stays constant.
- **Avatars:** there's no profile-picture feature, so each user gets a stable
  avatar derived from their id ([`lib/avatar.ts`](lib/avatar.ts)) — the same
  face everywhere. Swap for real uploads if that feature is added.
