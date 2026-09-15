import { getActiveDevices } from "@/lib/analytics-service";
import { requireAnalytics } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireAnalytics();
  if (denied) return denied;
  return Response.json(await getActiveDevices());
}
