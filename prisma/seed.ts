import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Standalone seed. Resets the database and generates a realistic dataset:
// many users, thousands of posts spread over time, likes, and comments/replies
// with their own likes. The volume exists to demonstrate that the read paths
// (keyset pagination, denormalized counters, batched likedByMe) hold up — the
// "designed for millions of reads" requirement, shown at a few-thousand scale.
//
// Run: npm run seed   (needs DATABASE_URL in .env)

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

// ---- knobs ---------------------------------------------------------------
const USERS = 25;
const POSTS = 3000;
const MAX_LIKES_PER_POST = 15;
const COMMENTED_POSTS = 150; // most-recent posts that get comments
const MAX_COMMENTS_PER_POST = 5;
const MAX_REPLIES_PER_COMMENT = 2;
const PASSWORD = "password123";
const BATCH = 5000;

const FIRST = ["Alex", "Sam", "Jordan", "Taylor", "Casey", "Riley", "Morgan", "Jamie", "Avery", "Quinn", "Noah", "Emma", "Liam", "Olivia", "Mia", "Ethan", "Ava", "Lucas", "Sofia", "Leo", "Nora", "Ravi", "Priya", "Chen", "Yuki"];
const LAST = ["Carter", "Reed", "Blake", "Hayes", "Nguyen", "Patel", "Kim", "Lopez", "Khan", "Silva", "Roy", "Cohen", "Walsh", "Ford", "Diaz"];
const POST_TEXTS = [
  "Shipped a new feature today and it feels great 🚀",
  "Coffee first, code later. ☕",
  "The best way to predict the future is to build it.",
  "Refactored a gnarly module — 200 lines lighter.",
  "Weekend project: a tiny CLI that saves me an hour a day.",
  "Reading about database indexing. Keyset pagination is underrated.",
  "Deploy on Friday? Living dangerously today.",
  "Just finished a great book on system design.",
  "Trying out a new coffee spot. Recommendations welcome ☕",
  "TIL: you can do more with SQL window functions than I thought.",
  "Sunset run cleared my head. Back to the keyboard.",
  "Pair programming actually made this bug obvious in 5 minutes.",
  "Small wins compound. Ship something today.",
  "Migrated the app to a new stack over the weekend. Worth it.",
  "Hot take: boring technology is a feature, not a bug.",
  "Finally understood how JWT sessions work end to end.",
  "New keyboard day. Productivity +10% (unverified).",
  "Wrote tests before the feature for once. Fewer surprises.",
  "The demo gods were kind today.",
  "Learning in public: here's what tripped me up this week.",
];
const COMMENT_TEXTS = [
  "This is great, congrats! 🎉",
  "Totally agree with this.",
  "How did you approach the tricky part?",
  "Saving this for later.",
  "Nice work — clean solution.",
  "I ran into the same thing last week.",
  "Any resources you'd recommend?",
  "Love the energy 🔥",
  "Underrated take.",
  "Following for more of this.",
];
const IMAGES = ["timeline_img.png", "img1.png", "img4.png", "img7.png", "photos1.png", "photos5.png", "post_img.png"].map((f) => `/assets/images/${f}`);

const rand = (n: number) => Math.floor(Math.random() * n);
const pick = <T,>(a: T[]) => a[rand(a.length)];
const chance = (p: number) => Math.random() < p;

async function chunked<T>(rows: T[], insert: (batch: T[]) => Promise<unknown>) {
  for (let i = 0; i < rows.length; i += BATCH) await insert(rows.slice(i, i + BATCH));
}

async function main() {
  console.log("Resetting database…");
  await prisma.commentLike.deleteMany();
  await prisma.postLike.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();

  console.log(`Creating ${USERS} users…`);
  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  const userData = Array.from({ length: USERS }, (_, i) => {
    const firstName = FIRST[i % FIRST.length];
    const lastName = pick(LAST);
    return { firstName, lastName, email: `${firstName.toLowerCase()}${i}@appifeed.dev`, passwordHash };
  });
  await prisma.user.createMany({ data: userData });
  const users = await prisma.user.findMany({ select: { id: true } });
  const userIds = users.map((u) => u.id);

  console.log(`Creating ${POSTS} posts…`);
  const now = Date.now();
  const day = 86_400_000;
  const postData = Array.from({ length: POSTS }, () => ({
    authorId: pick(userIds),
    text: pick(POST_TEXTS),
    imageUrl: chance(0.2) ? pick(IMAGES) : null,
    visibility: chance(0.12) ? ("PRIVATE" as const) : ("PUBLIC" as const),
    createdAt: new Date(now - rand(90) * day - rand(day)),
  }));
  await chunked(postData, (b) => prisma.post.createMany({ data: b }));
  const posts = await prisma.post.findMany({ select: { id: true }, orderBy: { createdAt: "desc" } });
  const postIds = posts.map((p) => p.id);

  console.log("Creating likes…");
  const likeRows: { postId: string; userId: string }[] = [];
  for (const postId of postIds) {
    const n = rand(MAX_LIKES_PER_POST + 1);
    const likers = new Set<string>();
    while (likers.size < n) likers.add(pick(userIds));
    for (const userId of likers) likeRows.push({ postId, userId });
  }
  await chunked(likeRows, (b) => prisma.postLike.createMany({ data: b, skipDuplicates: true }));

  console.log(`Creating comments on the ${COMMENTED_POSTS} most-recent posts…`);
  const recent = postIds.slice(0, COMMENTED_POSTS);
  const topLevel: { postId: string; authorId: string; body: string }[] = [];
  for (const postId of recent) {
    const n = rand(MAX_COMMENTS_PER_POST + 1);
    for (let i = 0; i < n; i++) topLevel.push({ postId, authorId: pick(userIds), body: pick(COMMENT_TEXTS) });
  }
  await chunked(topLevel, (b) => prisma.comment.createMany({ data: b }));
  const parents = await prisma.comment.findMany({ where: { parentId: null }, select: { id: true, postId: true } });

  const replies: { postId: string; parentId: string; authorId: string; body: string }[] = [];
  for (const parent of parents) {
    const n = rand(MAX_REPLIES_PER_COMMENT + 1);
    for (let i = 0; i < n; i++) replies.push({ postId: parent.postId, parentId: parent.id, authorId: pick(userIds), body: pick(COMMENT_TEXTS) });
  }
  await chunked(replies, (b) => prisma.comment.createMany({ data: b }));

  console.log("Creating comment likes…");
  const allComments = await prisma.comment.findMany({ select: { id: true } });
  const commentLikeRows: { commentId: string; userId: string }[] = [];
  for (const c of allComments) {
    const n = rand(9);
    const likers = new Set<string>();
    while (likers.size < n) likers.add(pick(userIds));
    for (const userId of likers) commentLikeRows.push({ commentId: c.id, userId });
  }
  await chunked(commentLikeRows, (b) => prisma.commentLike.createMany({ data: b, skipDuplicates: true }));

  console.log("Recomputing denormalized counters…");
  await prisma.$executeRawUnsafe(`
    UPDATE "Post" SET
      "likeCount" = (SELECT COUNT(*) FROM "PostLike" pl WHERE pl."postId" = "Post".id),
      "commentCount" = (SELECT COUNT(*) FROM "Comment" c WHERE c."postId" = "Post".id)
  `);
  await prisma.$executeRawUnsafe(`
    UPDATE "Comment" SET
      "likeCount" = (SELECT COUNT(*) FROM "CommentLike" cl WHERE cl."commentId" = "Comment".id)
  `);

  const [userCount, postCount, likeCount, commentCount] = await Promise.all([
    prisma.user.count(),
    prisma.post.count(),
    prisma.postLike.count(),
    prisma.comment.count(),
  ]);
  console.log("\nSeed complete:");
  console.log(`  users:    ${userCount}`);
  console.log(`  posts:    ${postCount}`);
  console.log(`  likes:    ${likeCount}`);
  console.log(`  comments: ${commentCount}`);
  console.log(`\nLog in with any seeded account, e.g.  ${userData[0].email} / ${PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
