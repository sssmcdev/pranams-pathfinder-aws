import "server-only";

import { getIronSession, type IronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

/**
 * Replaces starlette's SessionMiddleware + the AdminAuth backend in
 * backend/app/admin.py. Two tiers, not one:
 *
 *   - "admin": /admin, /analytics and /preview — everything.
 *   - "analytics": the dashboard and nothing else. For stakeholders who
 *     should see the numbers without the ability to edit POIs or open
 *     /preview.
 *
 * Accounts live in the admin_users table (see lib/admin-users.ts). The
 * ADMIN_USER / ADMIN_PASSWORD pair below is kept as a break-glass
 * account, always treated as "admin": it is how the first row gets
 * created on a fresh database, and how you get back in if every stored
 * password is lost.
 *
 * iron-session encrypts the cookie rather than merely signing it, so
 * unlike the previous itsdangerous cookie its contents are opaque to the
 * client as well as tamper-proof.
 */

export type Role = "admin" | "analytics";

export interface SessionData {
  authenticated?: boolean;
  /**
   * The signed-in person's email, or null/undefined for the env
   * break-glass account, which has no row and therefore no email. Code
   * that needs an identity must handle that absence rather than assume
   * one — `authenticated` remains the only thing the cookie asserts.
   *
   * Sessions issued before this field existed decrypt fine and simply
   * lack it, which is the same as the break-glass case.
   *
   * Note what is NOT stored here: the role, and whether a password change
   * is outstanding. Both are read from the row on each check, so changing
   * someone's role or resetting their password takes effect on their next
   * request instead of waiting for them to sign out.
   */
  email?: string | null;
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
 * The signed-in person's email, or null when the session belongs to the
 * env break-glass account (or predates emails entirely). Never throws for
 * a signed-out visitor — callers gate on isAuthenticated first.
 */
export async function currentAdminEmail(): Promise<string | null> {
  const session = await getSession();
  return session.authenticated ? (session.email ?? null) : null;
}

/**
 * The env break-glass credential check, not the ordinary one — stored
 * accounts are verified by authenticateAdmin in lib/admin-users.ts.
 *
 * Constant-time-ish. Node's timingSafeEqual needs equal lengths, so
 * compare digests rather than the raw strings — otherwise the comparison
 * leaks the password length.
 */
export async function verifyEnvCredentials(username: unknown, password: unknown): Promise<boolean> {
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

/**
 * Who the current session is, and whether it may act yet.
 *
 * Everything that can disqualify a session is decided here rather than
 * duplicated across routes and pages:
 *
 *   - "anonymous": no session, or a session for an account since
 *     deactivated or deleted — which is how removing someone ends the
 *     sessions they already hold;
 *   - "must-change-password": the account is still flagged. The flag
 *     means the password is known to whoever set it, so it is not yet
 *     proof of identity;
 *   - "ok", with the role the row currently carries.
 *
 * The env break-glass account has no row, so it is "ok" as an admin.
 *
 * admin-users is imported lazily so that merely importing this module
 * does not drag the database client in with it.
 */
export type Access =
  | { status: "anonymous" }
  | { status: "must-change-password"; role: Role }
  | { status: "ok"; role: Role };

export async function access(): Promise<Access> {
  const session = await getSession();
  if (!session.authenticated) return { status: "anonymous" };

  const email = session.email;
  if (!email) return { status: "ok", role: "admin" };

  const { getAdminByEmail } = await import("./admin-users");
  const admin = await getAdminByEmail(email);
  if (!admin || !admin.active) return { status: "anonymous" };

  const role = admin.role as Role;
  return admin.mustChangePassword
    ? { status: "must-change-password", role }
    : { status: "ok", role };
}

function forbidden(detail: string) {
  return Response.json({ detail }, { status: 403 });
}

const MUST_CHANGE = "Set your own password before using the panel";

/**
 * The gate for every /admin endpoint — adminRoute wraps it. A flagged
 * account is refused here so the forced password change cannot be skipped
 * by calling the API directly, and an analytics-only account is refused
 * because /admin is not theirs to reach.
 *
 * /api/auth/password does NOT go through here — it is the one endpoint a
 * flagged account has to be able to reach.
 */
export async function requireAdmin(): Promise<Response | null> {
  const a = await access();
  if (a.status === "anonymous") return unauthorized();
  if (a.status === "must-change-password") return forbidden(MUST_CHANGE);
  return a.role === "admin" ? null : forbidden("Administrator access required");
}

/** The dashboard is visible to both roles — a superset of requireAdmin,
 *  not a separate track. */
export async function requireAnalytics(): Promise<Response | null> {
  const a = await access();
  if (a.status === "anonymous") return unauthorized();
  if (a.status === "must-change-password") return forbidden(MUST_CHANGE);
  return null;
}

/**
 * The server-component equivalent of requireAdmin, used by the /admin
 * pages so a flagged, revoked or analytics-only session never has admin
 * data rendered into its HTML — the pages return null and AdminShell
 * paints the right screen over the top.
 */
export async function adminPageAllowed(): Promise<boolean> {
  const a = await access();
  return a.status === "ok" && a.role === "admin";
}
