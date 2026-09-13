import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { getIronSession, type IronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

import { db } from "@/db";
import { users } from "@/db/schema";
import { verifyPassword } from "./password";

/**
 * Replaces starlette's SessionMiddleware + the AdminAuth backend in
 * backend/app/admin.py. Two tiers now, not one:
 *   - "admin": the original single shared credential (env vars
 *     ADMIN_USER/ADMIN_PASSWORD) — /admin, /analytics and /preview, same
 *     as before.
 *   - "analytics": a named login from the `users` table — /analytics
 *     only. Added for stakeholders who should see the dashboard without
 *     the ability to edit POIs or use /preview.
 *
 * iron-session encrypts the cookie rather than merely signing it, so
 * unlike the previous itsdangerous cookie its contents are opaque to the
 * client as well as tamper-proof.
 */

export type Role = "admin" | "analytics";

export interface SessionData {
  authenticated?: boolean;
  role?: Role;
  /** Only set for a `users`-table login, never for the env-var admin. */
  userId?: string;
  /** True blocks every route except /api/auth/change-password. */
  mustChangePassword?: boolean;
}

const DEV_PASSWORD = "prasanthi2026";
const DEV_SECRET = "dev-only-change-me";

// Deliberately NOT keyed off NODE_ENV: that is "production" during any
// build, including a local `next build`, which would make this guard fire
// on a developer's laptop. Mirrors WAYFINDER_ENV from admin.py.
const APP_ENV = process.env.WAYFINDER_ENV ?? "development";

// Any Vercel deployment counts as deployed, preview included. A preview
// URL is public, is served over HTTPS, and points at the same live
// database as production — so it must not be allowed to run on the
// development default password, which is in the git history. Only a
// genuinely local process is exempt.
const IS_DEPLOYED = APP_ENV === "production" || Boolean(process.env.VERCEL);

export const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || DEV_PASSWORD;
const SESSION_SECRET = process.env.SESSION_SECRET || DEV_SECRET;

/**
 * Carried over from admin.py: refuse to run with development defaults on
 * a publicly reachable deployment. On Vercel this surfaces as a failed
 * build/boot rather than a silently insecure live site.
 */
if (IS_DEPLOYED && (ADMIN_PASSWORD === DEV_PASSWORD || SESSION_SECRET === DEV_SECRET)) {
  throw new Error(
    "ADMIN_PASSWORD and SESSION_SECRET must be set to real values on any deployed " +
      "environment (production AND preview) — refusing to start with development " +
      "defaults. Set them in the Vercel project's Environment Variables.",
  );
}

// iron-session derives an encryption key from this; anything shorter is
// rejected at runtime, so fail early and clearly instead.
if (SESSION_SECRET.length < 32) {
  throw new Error(
    `SESSION_SECRET must be at least 32 characters (got ${SESSION_SECRET.length}). ` +
      "Generate one with: openssl rand -base64 32",
  );
}

export const sessionOptions: SessionOptions = {
  password: SESSION_SECRET,
  cookieName: "pranams_session",
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax",
    secure: IS_DEPLOYED,
    path: "/",
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

export async function isAuthenticated(): Promise<boolean> {
  return Boolean((await getSession()).authenticated);
}

/**
 * Constant-time-ish check against the single env-var admin credential.
 * Node's timingSafeEqual needs equal lengths, so compare digests rather
 * than the raw strings — otherwise the comparison leaks the password
 * length.
 */
function verifyEnvAdminCredentials(username: string, password: string): boolean {
  const digest = (s: string) => createHash("sha256").update(s).digest();
  return (
    timingSafeEqual(digest(username), digest(ADMIN_USER)) &&
    timingSafeEqual(digest(password), digest(ADMIN_PASSWORD))
  );
}

export interface AuthResult {
  role: Role;
  userId: string | null;
  mustChangePassword: boolean;
}

/**
 * Tries the `users` table first (by email), then falls back to the
 * single env-var admin credential — so one login form serves both a
 * named analytics account and the original shared admin login. Returns
 * null on any failure; deliberately doesn't distinguish "no such user"
 * from "wrong password" to anything outside this function.
 */
export async function authenticate(identifier: unknown, password: unknown): Promise<AuthResult | null> {
  if (typeof identifier !== "string" || typeof password !== "string" || !password) return null;

  const [user] = await db.select().from(users).where(eq(users.email, identifier.toLowerCase())).limit(1);
  if (user) {
    if (!(await verifyPassword(password, user.passwordHash))) return null;
    return { role: user.role as Role, userId: user.id, mustChangePassword: user.mustChangePassword };
  }

  if (verifyEnvAdminCredentials(identifier, password)) {
    return { role: "admin", userId: null, mustChangePassword: false };
  }
  return null;
}

/** 401 in the {"detail": ...} shape the Python API used. */
export function unauthorized() {
  return Response.json({ detail: "Admin login required" }, { status: 401 });
}

/** True only once a flagged user has changed their password — used to
 *  block every route except the change-password endpoint itself. */
async function passwordChangeRequired(session: SessionData): Promise<boolean> {
  return Boolean(session.authenticated && session.mustChangePassword);
}

export async function requireAdmin(): Promise<Response | null> {
  const session = await getSession();
  if (await passwordChangeRequired(session)) return unauthorized();
  return session.role === "admin" ? null : unauthorized();
}

/** Admins can see analytics too — this is a superset of requireAdmin,
 *  not a separate track. */
export async function requireAnalytics(): Promise<Response | null> {
  const session = await getSession();
  if (await passwordChangeRequired(session)) return unauthorized();
  return session.role === "admin" || session.role === "analytics" ? null : unauthorized();
}

/** For /api/auth/change-password: any logged-in session, including one
 *  still flagged mustChangePassword — that is exactly the case this
 *  route exists to resolve. */
export async function requireAnySession(): Promise<Response | null> {
  return (await getSession()).authenticated ? null : unauthorized();
}
