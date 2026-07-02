// Extract a Prisma error code (e.g. "P2002" unique, "P2003" FK, "P2025" not
// found) without importing Prisma's error classes at call sites.
export function prismaErrorCode(err: unknown): string | null {
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code?: unknown }).code;
    return typeof code === "string" ? code : null;
  }
  return null;
}
