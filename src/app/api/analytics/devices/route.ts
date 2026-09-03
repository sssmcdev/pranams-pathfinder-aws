import { getActiveDevices } from "@/lib/analytics-service";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  return Response.json(await getActiveDevices());
}
