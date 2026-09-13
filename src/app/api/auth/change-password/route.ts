import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword } from "@/lib/password";
import { getSession, requireAnySession } from "@/lib/session";

export const dynamic = "force-dynamic";

const MIN_LENGTH = 8;

export async function POST(request: Request) {
  const denied = await requireAnySession();
  if (denied) return denied;

  const session = await getSession();
  // The env-var admin has no row in `users` — nothing to update, and it
  // never carries mustChangePassword anyway (see authenticate()).
  if (!session.userId) {
    return Response.json({ detail: "This account has no password to change here" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ detail: "Invalid JSON" }, { status: 422 });
  }

  const newPassword = body.new_password;
  if (typeof newPassword !== "string" || newPassword.length < MIN_LENGTH) {
    return Response.json(
      { detail: `Password must be at least ${MIN_LENGTH} characters` },
      { status: 422 },
    );
  }

  await db
    .update(users)
    .set({ passwordHash: await hashPassword(newPassword), mustChangePassword: false })
    .where(eq(users.id, session.userId));

  session.mustChangePassword = false;
  await session.save();
  return Response.json({ ok: true });
}
