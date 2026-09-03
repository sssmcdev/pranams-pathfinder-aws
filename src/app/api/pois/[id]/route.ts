import { getPoi } from "@/lib/pois-service";
import { badRequest, parseLang } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const lang = parseLang(new URL(request.url).searchParams.get("lang"));
  const poi = await getPoi(id, lang);
  if (!poi) return badRequest("POI not found", 404);
  return Response.json(poi);
}
