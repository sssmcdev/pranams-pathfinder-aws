import { getSession, verifyCredentials } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ detail: "Invalid JSON" }, { status: 422 });
  }

  if (!(await verifyCredentials(body.username, body.password))) {
    return Response.json({ detail: "Invalid credentials" }, { status: 401 });
  }

  const session = await getSession();
  session.authenticated = true;
  await session.save();
  return Response.json({ ok: true });
}
