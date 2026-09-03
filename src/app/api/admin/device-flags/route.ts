import { adminRoute } from "@/lib/admin-route";
import { listDeviceFlagsAdmin } from "@/lib/admin-service";

export const dynamic = "force-dynamic";

export async function GET() {
  return adminRoute(() => listDeviceFlagsAdmin());
}
