import { adminRoute } from "@/lib/admin-route";
import { listFeedbackAdmin } from "@/lib/admin-service";

export const dynamic = "force-dynamic";

export async function GET() {
  return adminRoute(() => listFeedbackAdmin());
}
