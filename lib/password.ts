import bcrypt from "bcryptjs";

// bcryptjs (pure JS) over argon2/native bcrypt: it builds with zero native
// toolchain on both Windows (local) and Linux (Vercel), so the deploy can't
// fail on a gyp build. argon2id is preferable in a high-security production
// setting; bcrypt at cost 12 is a well-accepted industry standard.
const COST = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
