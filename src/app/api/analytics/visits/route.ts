import { getVisits } from "@/lib/analytics-service";
import { badRequest } from "@/lib/http";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

export async function GET(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const params = new URL(request.url).searchParams;
  const page = Number(params.get("page") ?? "0");
  if (!Number.isInteger(page) || page < 0) return badRequest("Invalid page");

  const { visits, total } = await getVisits(PAGE_SIZE, page * PAGE_SIZE);
  return Response.json({ visits, total, page, page_size: PAGE_SIZE });
}
