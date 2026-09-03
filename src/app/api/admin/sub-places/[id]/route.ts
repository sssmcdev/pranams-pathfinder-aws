import { eq } from "drizzle-orm";

import { db } from "@/db";
import { subPlaces } from "@/db/schema";
import { adminRoute, jsonBody } from "@/lib/admin-route";
import { getSubPlaceAdmin, subPlaceFromInput, ValidationError } from "@/lib/admin-service";

export const dynamic = "force-dynamic";

export async function GET(_r: Request, ctx: { params: Promise<{ id: string }> }) {
  return adminRoute(async () => {
    const row = await getSubPlaceAdmin((await ctx.params).id);
    if (!row) throw new ValidationError("Sub-place not found");
    return row;
  });
}

export async function PUT(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return adminRoute(async () => {
    const { id } = await ctx.params;
    const values = subPlaceFromInput(await jsonBody(request));
    const [row] = await db.update(subPlaces).set(values).where(eq(subPlaces.id, id)).returning();
    if (!row) throw new ValidationError("Sub-place not found");
    return row;
  });
}

export async function DELETE(_r: Request, ctx: { params: Promise<{ id: string }> }) {
  return adminRoute(async () => {
    await db.delete(subPlaces).where(eq(subPlaces.id, (await ctx.params).id));
    return { ok: true };
  });
}
