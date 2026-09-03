import { db } from "@/db";
import { subPlaces } from "@/db/schema";
import { adminRoute, jsonBody } from "@/lib/admin-route";
import { identifier, listSubPlacesAdmin, subPlaceFromInput } from "@/lib/admin-service";

export const dynamic = "force-dynamic";

export async function GET() {
  return adminRoute(() => listSubPlacesAdmin());
}

export async function POST(request: Request) {
  return adminRoute(async () => {
    const body = await jsonBody(request);
    const values = { id: identifier(body.id), ...subPlaceFromInput(body) };
    const [row] = await db.insert(subPlaces).values(values).returning();
    return row;
  });
}
