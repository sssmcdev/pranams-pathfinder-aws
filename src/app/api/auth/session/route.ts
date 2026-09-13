import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  return Response.json({
    authenticated: Boolean(session.authenticated),
    role: session.role ?? null,
    must_change_password: Boolean(session.mustChangePassword),
  });
}
