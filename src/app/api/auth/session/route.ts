import { isAuthenticated } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ authenticated: await isAuthenticated() });
}
