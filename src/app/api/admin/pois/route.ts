import { db } from "@/db";
import { pois } from "@/db/schema";
import { adminRoute, jsonBody } from "@/lib/admin-route";
import { identifier, listPoisAdmin, poiFromInput } from "@/lib/admin-service";

export const dynamic = "force-dynamic";

export async function GET() {
  return adminRoute(() => listPoisAdmin());
}

export async function POST(request: Request) {
  return adminRoute(async () => {
    const body = await jsonBody(request);
    const values = { id: identifier(body.id), ...poiFromInput(body) };
    const [row] = await db.insert(pois).values(values).returning();
    return row;
  });
}
