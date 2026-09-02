import { haversineM } from "@/lib/geo";
import { listPois } from "@/lib/pois-service";
import { badRequest, parseCategory, parseLang } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  // Number(null) is 0, and 0 is finite — so an absent parameter must be
  // rejected before it is coerced, or a request with no coordinates
  // silently reports distances from lat 0/lon 0 in the Atlantic.
  const latRaw = params.get("lat");
  const lonRaw = params.get("lon");
  if (latRaw === null || lonRaw === null || latRaw.trim() === "" || lonRaw.trim() === "") {
    return badRequest("lat and lon are required");
  }
  const lat = Number(latRaw);
  const lon = Number(lonRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return badRequest("lat and lon must be numbers");
  }
  const category = parseCategory(params.get("category"));
  if (category === null) return badRequest("Invalid category");

  const limitRaw = Number(params.get("limit") ?? 10);
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(100, limitRaw)) : 10;

  const pois = await listPois({ category, lang: parseLang(params.get("lang")) });
  const withDistance = pois
    .map((p) => ({ ...p, distance_m: haversineM({ lat, lon }, p) }))
    .sort((a, b) => a.distance_m - b.distance_m)
    .slice(0, limit);

  return Response.json(withDistance);
}
