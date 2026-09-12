import { authenticate, getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ detail: "Invalid JSON" }, { status: 422 });
  }

  // "username" is the historical field name (the env-var admin login has
  // no email), but a users-table login's email goes in the same field —
  // one login form serves both.
  const result = await authenticate(body.username, body.password);
  if (!result) {
    return Response.json({ detail: "Invalid credentials" }, { status: 401 });
  }

  const session = await getSession();
  session.authenticated = true;
  session.role = result.role;
  session.userId = result.userId ?? undefined;
  session.mustChangePassword = result.mustChangePassword;
  await session.save();
  return Response.json({ ok: true, must_change_password: result.mustChangePassword });
}
