import { getAdminByEmail } from "@/lib/admin-users";
import { currentAdminEmail, isAuthenticated } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Every admin surface polls this on mount, so it also carries the forced
 * password change — read from the row rather than from the cookie, so a
 * reset by another admin takes effect on the target's next page load
 * instead of waiting for them to sign out.
 *
 * A session whose email no longer resolves to an active row is reported
 * as signed out: that is how deactivating or deleting an admin ends the
 * sessions they already hold.
 */
export async function GET() {
  if (!(await isAuthenticated())) {
    return Response.json({ authenticated: false, email: null, mustChangePassword: false });
  }

  const email = await currentAdminEmail();

  // No email means the env break-glass account, which has no row to check
  // and no password this app can change.
  if (!email) {
    return Response.json({ authenticated: true, email: null, mustChangePassword: false });
  }

  const admin = await getAdminByEmail(email);
  if (!admin || !admin.active) {
    return Response.json({ authenticated: false, email: null, mustChangePassword: false });
  }

  return Response.json({
    authenticated: true,
    email: admin.email,
    mustChangePassword: admin.mustChangePassword,
  });
}
