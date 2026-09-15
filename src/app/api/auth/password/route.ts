import { changeOwnPassword } from "@/lib/admin-users";
import { ValidationError } from "@/lib/admin-service";
import { currentAdminEmail, isAuthenticated, unauthorized } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Self-service password change. Deliberately NOT routed through
 * adminRoute: this is the one endpoint an admin must be able to reach
 * while flagged for a forced change, and keeping it out of that wrapper
 * stops the two concerns drifting into each other.
 */
export async function POST(request: Request) {
  if (!(await isAuthenticated())) return unauthorized();

  const email = await currentAdminEmail();
  if (!email) {
    return Response.json(
      {
        detail:
          "You are signed in with the environment admin account, which has no stored " +
          "password to change. Change ADMIN_PASSWORD in the environment instead.",
      },
      { status: 422 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ detail: "Invalid JSON" }, { status: 422 });
  }

  try {
    await changeOwnPassword(email, body.currentPassword, body.newPassword);
  } catch (err) {
    if (err instanceof ValidationError) {
      return Response.json({ detail: err.message }, { status: 422 });
    }
    console.error("[auth/password]", err);
    return Response.json({ detail: "Unexpected error" }, { status: 500 });
  }

  return Response.json({ ok: true });
}
