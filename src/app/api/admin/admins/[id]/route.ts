import { adminRoute, jsonBody } from "@/lib/admin-route";
import { deleteAdmin, resetAdminPassword, setAdminActive } from "@/lib/admin-users";
import { ValidationError } from "@/lib/admin-service";
import { currentAdminEmail } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Two distinct edits share this handler, picked by which field the body
 * carries: `password` resets the account's password, `active` switches it
 * on or off. Sending both at once is refused rather than guessed at.
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

    const hasPassword = body.password !== undefined;
    const hasActive = body.active !== undefined;

    if (hasPassword && hasActive) {
      throw new ValidationError("Change the password or the status, not both at once");
    }
    if (hasPassword) return resetAdminPassword(id, body.password);
    if (hasActive) return setAdminActive(id, body.active === true, actor);

    throw new ValidationError("Nothing to change");
  });
}

export async function DELETE(_r: Request, ctx: { params: Promise<{ id: string }> }) {
  return adminRoute(async () => {
    await deleteAdmin((await ctx.params).id, await currentAdminEmail());
    return { ok: true };
  });
}
