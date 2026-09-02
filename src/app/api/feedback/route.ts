import { randomUUID } from "node:crypto";

import { db } from "@/db";
import { feedback } from "@/db/schema";
import { badRequest } from "@/lib/http";

export const dynamic = "force-dynamic";

function rating(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5
    ? value
    : null;
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON");
  }

  const navigation = rating(body.rating_navigation);
  const infoAccuracy = rating(body.rating_info_accuracy);
  const overall = rating(body.rating_overall);
  if (navigation === null || infoAccuracy === null || overall === null) {
    return badRequest("All three ratings are required, each an integer from 1 to 5");
  }

  const comment = typeof body.comment === "string" ? body.comment.trim().slice(0, 2000) : "";

  await db.insert(feedback).values({
    id: randomUUID().replace(/-/g, ""),
    ratingNavigation: navigation,
    ratingInfoAccuracy: infoAccuracy,
    ratingOverall: overall,
    comment: comment || null,
    createdAt: new Date().toISOString(),
  });

  return Response.json({ ok: true });
}
