import { authenticateAdmin } from "@/lib/admin-users";
import { getSession, verifyEnvCredentials } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Two ways in, tried in this order:
 *
 *   1. An admin_users row, matched on email. The ordinary path, and the
 *      one that carries a role.
 *   2. The ADMIN_USER / ADMIN_PASSWORD env pair — the break-glass account
 *      that seeds the first row on a fresh database and gets you back in
 *      when every stored password is lost. Always an administrator.
 *
 * The stored accounts are tried first so that an env username which
 * happens to collide with somebody's email cannot shadow their account.
 *
 * Both failures return the same 401 with the same wording, and the email
 * lookup returns null for unknown-address, wrong-password and
 * deactivated alike — nothing here may reveal which emails have accounts.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ detail: "Invalid JSON" }, { status: 422 });
  }

  // "username" is the historical field name and older clients still send
  // it; "email" is the name that now describes it. One login form serves
  // both the named accounts and the env break-glass login.
  const identity = body.email ?? body.username;

  const admin = await authenticateAdmin(identity, body.password);

  if (!admin && !(await verifyEnvCredentials(identity, body.password))) {
    return Response.json({ detail: "Invalid credentials" }, { status: 401 });
  }

  const session = await getSession();
  session.authenticated = true;
  session.email = admin ? admin.email : null;
  await session.save();

  // The role is deliberately reported but not stored in the cookie — see
  // the note on SessionData. It is re-read from the row on every check.
  return Response.json({
    ok: true,
    email: admin?.email ?? null,
    role: admin?.role ?? "admin",
    mustChangePassword: admin?.mustChangePassword ?? false,
  });
}
