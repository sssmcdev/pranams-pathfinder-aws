import { ValidationError } from "./admin-service";
import { requireAdmin } from "./session";

/**
 * Postgres SQLSTATE codes worth reporting as user errors rather than
 * server faults. Matched on the code, not the message: drizzle wraps
 * driver errors ("Failed query: insert into …") and the real one arrives
 * on `.cause`, so message-matching silently fails and everything becomes
 * an opaque 500.
 */
const SQLSTATE: Record<string, { status: number; detail: string }> = {
  "23505": { status: 409, detail: "That ID is already in use" },
  "23503": { status: 422, detail: "That place does not exist" },
  "23502": { status: 422, detail: "A required field was missing" },
  "22P02": { status: 422, detail: "A field had the wrong type" },
  "22001": { status: 422, detail: "A field was too long" },
};

function sqlState(err: unknown): string | null {
  for (let e: unknown = err, depth = 0; e && depth < 5; depth++) {
    const code = (e as { code?: unknown }).code;
    if (typeof code === "string" && /^[0-9A-Z]{5}$/.test(code)) return code;
    e = (e as { cause?: unknown }).cause;
  }
  return null;
}

/** Every admin route: gate on the session, then map known failures to the
 *  same {"detail": ...} shape the rest of the API uses. */
export async function adminRoute<T>(handler: () => Promise<T>): Promise<Response> {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    return Response.json(await handler());
  } catch (err) {
    if (err instanceof ValidationError) {
      return Response.json({ detail: err.message }, { status: 422 });
    }
    const known = SQLSTATE[sqlState(err) ?? ""];
    if (known) return Response.json({ detail: known.detail }, { status: known.status });

    console.error("[admin]", err);
    return Response.json({ detail: "Unexpected error" }, { status: 500 });
  }
}

export async function jsonBody(request: Request): Promise<Record<string, unknown>> {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    throw new ValidationError("Invalid JSON");
  }
}
