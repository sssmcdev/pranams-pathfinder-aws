import { eq } from "drizzle-orm";

import { db } from "@/db";
import { pois } from "@/db/schema";
import { adminRoute, jsonBody } from "@/lib/admin-route";
import { deletePoiAdmin, getPoiAdmin, poiFromInput, ValidationError } from "@/lib/admin-service";

export const dynamic = "force-dynamic";

export async function GET(_r: Request, ctx: { params: Promise<{ id: string }> }) {
  return adminRoute(async () => {
    const row = await getPoiAdmin((await ctx.params).id);
    if (!row) throw new ValidationError("POI not found");
    return row;
  });
}

export async function PUT(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return adminRoute(async () => {
    const { id } = await ctx.params;
    // The id comes from the URL and is never taken from the body, so an
    // edit cannot silently re-key a record (and orphan its sub-places).
    const values = poiFromInput(await jsonBody(request));
    const [row] = await db.update(pois).set(values).where(eq(pois.id, id)).returning();
    if (!row) throw new ValidationError("POI not found");
    return row;
  });
}

export async function DELETE(_r: Request, ctx: { params: Promise<{ id: string }> }) {
  return adminRoute(async () => {
    await deletePoiAdmin((await ctx.params).id);
    return { ok: true };
  });
}
