import { adminRoute, jsonBody } from "@/lib/admin-route";
import { createAdmin, listAdmins } from "@/lib/admin-users";

export const dynamic = "force-dynamic";

export async function GET() {
  return adminRoute(() => listAdmins());
}

export async function POST(request: Request) {
  return adminRoute(async () => createAdmin(await jsonBody(request)));
}
