import {
  getDashboard,
  isGranularity,
  isRange,
} from "@/lib/analytics-service";
import { badRequest } from "@/lib/http";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const params = new URL(request.url).searchParams;
  const range = params.get("range") ?? "30d";
  const granularity = params.get("granularity") ?? "day";
  if (!isRange(range)) return badRequest("Invalid range");
  if (!isGranularity(granularity)) return badRequest("Invalid granularity");

  return Response.json(await getDashboard(range, granularity, params.get("category")));
}
