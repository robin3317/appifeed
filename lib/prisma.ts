import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7 uses driver adapters. PrismaPg (node-postgres) talks to Neon over
// the standard Postgres wire protocol; the connection string carries
// sslmode=require.
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

// Single Prisma client across hot reloads in dev (Next.js re-imports modules,
// which would otherwise open a new connection pool on every change).
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
