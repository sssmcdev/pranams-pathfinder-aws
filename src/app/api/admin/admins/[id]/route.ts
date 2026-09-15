import { adminRoute, jsonBody } from "@/lib/admin-route";
import { deleteAdmin, resetAdminPassword, setAdminActive, setAdminRole } from "@/lib/admin-users";
import { ValidationError } from "@/lib/admin-service";
import { currentAdminEmail } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Three distinct edits share this handler, picked by which field the body
 * carries: `password` resets the account's password, `active` switches it
 * on or off, and `role` moves it between administrator and analytics-only.
 * Sending more than one at once is refused rather than guessed at.
 *
 * The acting admin's email is read from the session, never from the body
 * — it is what the "not yourself" guards in admin-users.ts are checked
 * against, so it must not be something the client can state.
 */
export async function PUT(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return adminRoute(async () => {
    const { id } = await ctx.params;
    const body = await jsonBody(request);
    const actor = await currentAdminEmail();

    const given = (["password", "active", "role"] as const).filter(
      (k) => body[k] !== undefined,
    );

    if (given.length > 1) {
      throw new ValidationError("Change one thing at a time");
    }
    if (given[0] === "password") return resetAdminPassword(id, body.password);
    if (given[0] === "active") return setAdminActive(id, body.active === true, actor);
    if (given[0] === "role") return setAdminRole(id, body.role, actor);

    throw new ValidationError("Nothing to change");
  });
}

export async function DELETE(_r: Request, ctx: { params: Promise<{ id: string }> }) {
  return adminRoute(async () => {
    await deleteAdmin((await ctx.params).id, await currentAdminEmail());
    return { ok: true };
  });
}
