import { listPois } from "@/lib/pois-service";
import { badRequest, parseCategory, parseLang } from "@/lib/http";

// Reads live data on every request; nothing here is prerenderable.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const category = parseCategory(params.get("category"));
  if (category === null) return badRequest("Invalid category");

  const pois = await listPois({
    category,
    q: params.get("q"),
    lang: parseLang(params.get("lang")),
  });
  return Response.json(pois);
}
