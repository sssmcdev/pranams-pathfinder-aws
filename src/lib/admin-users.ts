import "server-only";

import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { adminUsers, type AdminUser } from "@/db/schema";
import { ValidationError } from "./admin-service";
import { hashPassword, needsRehash, verifyPassword } from "./password";
import { MIN_PASSWORD_LENGTH } from "./password-policy";

/**
 * The admin account list behind /admin/admins, and the lookups the login
 * flow uses.
 *
 * Every query here runs sequentially and is never fired concurrently with
 * another — see the max:1 note in db/index.ts, where pipelining against
 * Supavisor's transaction mode deadlocks rather than erroring.
 */

/** Deliberately not a full RFC 5322 parse: this only has to reject typos
 *  and obvious nonsense, and an admin's address is entered by another
 *  admin who can see what they typed. */
const EMAIL_RE = /^[^\s@]+@[^\s@.]+\.[^\s@]+$/;

export { MIN_PASSWORD_LENGTH };

export function normalizeEmail(value: unknown): string {
  if (typeof value !== "string") throw new ValidationError("Email is required");
  const email = value.trim().toLowerCase();
  if (!email) throw new ValidationError("Email is required");
  if (email.length > 254) throw new ValidationError("Email is too long");
  if (!EMAIL_RE.test(email)) throw new ValidationError("That does not look like an email address");
  return email;
}

/**
 * Length is the only rule. Composition rules (a digit, a symbol, mixed
 * case) push people towards predictable substitutions and a written-down
 * password; a long one they can actually remember is stronger, and NIST
 * has recommended against the composition rules since SP 800-63B.
 */
export function validatePassword(value: unknown): string {
  if (typeof value !== "string" || !value) throw new ValidationError("Password is required");
  if (value.length < MIN_PASSWORD_LENGTH) {
    throw new ValidationError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }
  if (value.length > 200) throw new ValidationError("Password is too long (max 200)");
  return value;
}

/** The shape sent to the browser. The hash never leaves the server. */
export type AdminUserPublic = Omit<AdminUser, "passwordHash">;

function toPublic(row: AdminUser): AdminUserPublic {
  const { passwordHash: _hash, ...rest } = row;
  return rest;
}

export async function listAdmins(): Promise<AdminUserPublic[]> {
  const rows = await db.select().from(adminUsers).orderBy(asc(adminUsers.email));
  return rows.map(toPublic);
}

async function findByEmail(email: string): Promise<AdminUser | undefined> {
  const [row] = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
  return row;
}

export async function countActiveAdmins(): Promise<number> {
  const rows = await db.select({ id: adminUsers.id }).from(adminUsers).where(eq(adminUsers.active, true));
  return rows.length;
}

/**
 * The login check. Returns null for a wrong password, an unknown email, a
 * deactivated account and a malformed stored digest alike — the caller
 * must not distinguish them to the client, or the response becomes an
 * oracle for which addresses are admins.
 *
 * The digest is still verified for an inactive account so that signing in
 * as one costs the same time as signing in as an active one.
 */
export async function authenticateAdmin(
  emailInput: unknown,
  password: unknown,
): Promise<AdminUser | null> {
  if (typeof emailInput !== "string" || typeof password !== "string") return null;
  const email = emailInput.trim().toLowerCase();
  if (!email) return null;

  const row = await findByEmail(email);
  if (!row) return null;
  if (!(await verifyPassword(password, row.passwordHash))) return null;
  if (!row.active) return null;

  await db
    .update(adminUsers)
    .set({ lastLoginAt: new Date().toISOString() })
    .where(eq(adminUsers.id, row.id));

  // Costs are raised over time; carry an old digest forward now that we
  // hold the plaintext, which is the only moment it can be done.
  if (needsRehash(row.passwordHash)) {
    await db
      .update(adminUsers)
      .set({ passwordHash: await hashPassword(password) })
      .where(eq(adminUsers.id, row.id));
  }

  return row;
}

export async function getAdminByEmail(email: string): Promise<AdminUserPublic | null> {
  const row = await findByEmail(email.trim().toLowerCase());
  return row ? toPublic(row) : null;
}

export async function createAdmin(input: Record<string, unknown>): Promise<AdminUserPublic> {
  const email = normalizeEmail(input.email);
  const password = validatePassword(input.password);

  if (await findByEmail(email)) throw new ValidationError("That email is already an admin");

  const [row] = await db
    .insert(adminUsers)
    .values({
      id: crypto.randomUUID(),
      email,
      passwordHash: await hashPassword(password),
      // Whoever creates the account knows the password they typed, so it
      // is shared knowledge until the new admin replaces it.
      mustChangePassword: true,
      active: true,
      createdAt: new Date().toISOString(),
    })
    .returning();
  return toPublic(row);
}

async function requireById(id: string): Promise<AdminUser> {
  const [row] = await db.select().from(adminUsers).where(eq(adminUsers.id, id)).limit(1);
  if (!row) throw new ValidationError("Admin not found");
  return row;
}

/**
 * Reset by another admin. Not a self-service flow: it hands back nothing,
 * because the new password is the one the resetting admin just typed and
 * has to pass on. The target must change it at next sign-in.
 */
export async function resetAdminPassword(
  id: string,
  password: unknown,
): Promise<AdminUserPublic> {
  const row = await requireById(id);
  const next = validatePassword(password);
  const [updated] = await db
    .update(adminUsers)
    .set({ passwordHash: await hashPassword(next), mustChangePassword: true })
    .where(eq(adminUsers.id, row.id))
    .returning();
  return toPublic(updated);
}

/**
 * Deactivating is the reversible half of removing an admin. The guards
 * exist so the panel cannot be locked out of itself: you cannot switch
 * yourself off, and the last active account cannot be switched off
 * either.
 */
export async function setAdminActive(
  id: string,
  active: boolean,
  actorEmail: string | null,
): Promise<AdminUserPublic> {
  const row = await requireById(id);

  if (!active) {
    if (actorEmail && row.email === actorEmail) {
      throw new ValidationError("You cannot deactivate your own account");
    }
    if (row.active && (await countActiveAdmins()) <= 1) {
      throw new ValidationError("This is the last active admin — add another first");
    }
  }

  const [updated] = await db
    .update(adminUsers)
    .set({ active })
    .where(eq(adminUsers.id, row.id))
    .returning();
  return toPublic(updated);
}

export async function deleteAdmin(id: string, actorEmail: string | null): Promise<void> {
  const row = await requireById(id);
  if (actorEmail && row.email === actorEmail) {
    throw new ValidationError("You cannot delete your own account");
  }
  if (row.active && (await countActiveAdmins()) <= 1) {
    throw new ValidationError("This is the last active admin — add another first");
  }
  await db.delete(adminUsers).where(eq(adminUsers.id, row.id));
}

/**
 * Self-service change, and the only path that clears mustChangePassword.
 * The current password is required even when the account is flagged for a
 * forced change: the session alone must not be enough to set a new
 * password, or an unattended signed-in browser becomes an account
 * takeover.
 */
export async function changeOwnPassword(
  email: string,
  currentPassword: unknown,
  newPassword: unknown,
): Promise<void> {
  const row = await findByEmail(email.trim().toLowerCase());
  if (!row) throw new ValidationError("Admin not found");

  if (typeof currentPassword !== "string" || !(await verifyPassword(currentPassword, row.passwordHash))) {
    throw new ValidationError("Your current password is not correct");
  }

  const next = validatePassword(newPassword);
  if (await verifyPassword(next, row.passwordHash)) {
    throw new ValidationError("The new password must be different from the current one");
  }

  await db
    .update(adminUsers)
    .set({ passwordHash: await hashPassword(next), mustChangePassword: false })
    .where(eq(adminUsers.id, row.id));
}

/** Used by the login route to decide whether the env break-glass account
 *  should still be accepted. */
export async function hasAnyAdmin(): Promise<boolean> {
  const [row] = await db.select({ id: adminUsers.id }).from(adminUsers).limit(1);
  return Boolean(row);
}
