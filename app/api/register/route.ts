import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { parseJson, registerSchema } from "@/lib/validation";
import { json, conflict, serverError } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const parsed = await parseJson(req, registerSchema);
  if (!parsed.ok) return parsed.response;

  const { firstName, lastName, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return conflict("An account with this email already exists");

  try {
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { firstName, lastName, email, passwordHash },
      select: { id: true, email: true },
    });
    return json({ id: user.id, email: user.email }, 201);
  } catch (err) {
    // Handle the check-then-insert race: two concurrent signups with the same
    // email. The unique constraint throws P2002 — treat it as a clean 409.
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: string }).code === "P2002"
    ) {
      return conflict("An account with this email already exists");
    }
    console.error("register failed", err);
    return serverError();
  }
}
