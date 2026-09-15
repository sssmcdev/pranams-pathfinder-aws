import { access, getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Every signed-in surface polls this on mount. It reports the role and
 * the outstanding password change from the row rather than the cookie, so
 * a reset or a role change by another administrator takes effect on the
 * target's next page load instead of waiting for them to sign out.
 *
 * A session whose email no longer resolves to an active row is reported
 * as signed out: that is how deactivating or deleting an account ends the
 * sessions it already holds.
 */
export async function GET() {
  const a = await access();

  if (a.status === "anonymous") {
    return Response.json({
      authenticated: false,
      email: null,
      role: null,
      mustChangePassword: false,
    });
  }

  const session = await getSession();

  return Response.json({
    authenticated: true,
    // No email means the env break-glass account, which has no row.
    email: session.email ?? null,
    role: a.role,
    mustChangePassword: a.status === "must-change-password",
  });
}
