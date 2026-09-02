import "server-only";

import { getIronSession, type IronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

/**
 * Replaces starlette's SessionMiddleware + the AdminAuth backend in
 * backend/app/admin.py. One admin credential, shared by /admin,
 * /analytics and /preview — signing in once grants all three, exactly as
 * the single `authenticated` session flag did before.
 *
 * iron-session encrypts the cookie rather than merely signing it, so
 * unlike the previous itsdangerous cookie its contents are opaque to the
 * client as well as tamper-proof.
 */

export interface SessionData {
  authenticated?: boolean;
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
 * Constant-time-ish credential check. Node's timingSafeEqual needs equal
 * lengths, so compare digests rather than the raw strings — otherwise the
 * comparison leaks the password length.
 */
export async function verifyCredentials(username: unknown, password: unknown): Promise<boolean> {
  if (typeof username !== "string" || typeof password !== "string") return false;
  const { createHash, timingSafeEqual } = await import("node:crypto");
  const digest = (s: string) => createHash("sha256").update(s).digest();
  return (
    timingSafeEqual(digest(username), digest(ADMIN_USER)) &&
    timingSafeEqual(digest(password), digest(ADMIN_PASSWORD))
  );
}

/** 401 in the {"detail": ...} shape the Python API used. */
export function unauthorized() {
  return Response.json({ detail: "Admin login required" }, { status: 401 });
}

export async function requireAdmin(): Promise<Response | null> {
  return (await isAuthenticated()) ? null : unauthorized();
}
