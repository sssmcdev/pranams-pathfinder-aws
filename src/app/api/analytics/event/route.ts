import { randomUUID } from "node:crypto";
import { and, eq, gte } from "drizzle-orm";

import { db } from "@/db";
import { analyticsEvents, deviceFlags } from "@/db/schema";
import { EVENT_TYPES, type EventType } from "@/lib/domain";
import { badRequest } from "@/lib/http";

export const dynamic = "force-dynamic";

/** A device logging this many searches in this window is flagged for admin
 *  visibility — never blocked, never rate-limited. */
const SEARCH_ANOMALY_THRESHOLD = 10;
const SEARCH_ANOMALY_WINDOW_MINUTES = 15;

/**
 * The proxy-forwarded address, truncated before it is ever stored: last
 * IPv4 octet (or last IPv6 group) zeroed. A coarse signal, not a precise
 * identifier. Retained for 1 year — see the purge script.
 */
function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip")?.trim();
  if (!ip) return null;

  if (ip.includes(":")) {
    const parts = ip.split(":");
    return parts.length > 1 ? [...parts.slice(0, -1), "0"].join(":") : ip;
  }
  const parts = ip.split(".");
  if (parts.length === 4) return [...parts.slice(0, 3), "0"].join(".");
  return ip;
}

function coord(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

async function checkSearchAnomaly(deviceId: string, ipAddress: string | null, now: Date) {
  const windowStart = new Date(
    now.getTime() - SEARCH_ANOMALY_WINDOW_MINUTES * 60_000,
  ).toISOString();

  const recent = await db
    .select({ q: analyticsEvents.searchQuery })
    .from(analyticsEvents)
    .where(
      and(
        eq(analyticsEvents.deviceId, deviceId),
        eq(analyticsEvents.eventType, "search"),
        gte(analyticsEvents.createdAt, windowStart),
      ),
    );
  if (recent.length < SEARCH_ANOMALY_THRESHOLD) return;

  // Don't spawn a fresh flag on every search once a device is already over
  // the threshold — only start a new one when its last flag has aged out.
  const [existing] = await db
    .select({ id: deviceFlags.id })
    .from(deviceFlags)
    .where(and(eq(deviceFlags.deviceId, deviceId), gte(deviceFlags.flaggedAt, windowStart)))
    .limit(1);
  if (existing) return;

  const sampleQueries = [...new Set(recent.map((r) => r.q).filter(Boolean))]
    .join(", ")
    .slice(0, 500);

  await db.insert(deviceFlags).values({
    id: randomUUID().replace(/-/g, ""),
    deviceId,
    ipAddress,
    eventCount: recent.length,
    windowMinutes: SEARCH_ANOMALY_WINDOW_MINUTES,
    sampleQueries: sampleQueries || null,
    flaggedAt: now.toISOString(),
  });
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON");
  }

  const eventType = body.event_type;
  if (typeof eventType !== "string" || !EVENT_TYPES.includes(eventType as EventType)) {
    return badRequest("Invalid event_type");
  }

  const deviceId =
    typeof body.device_id === "string" ? body.device_id.trim().slice(0, 64) || null : null;
  const searchQuery =
    typeof body.search_query === "string" ? body.search_query.trim().slice(0, 200) || null : null;
  const ipAddress = clientIp(request);
  const now = new Date();

  await db.insert(analyticsEvents).values({
    id: randomUUID().replace(/-/g, ""),
    eventType,
    poiId: typeof body.poi_id === "string" ? body.poi_id : null,
    category: typeof body.category === "string" ? body.category : null,
    searchQuery,
    lat: coord(body.lat),
    lon: coord(body.lon),
    deviceId,
    ipAddress,
    createdAt: now.toISOString(),
  });

  if (eventType === "search" && deviceId) {
    await checkSearchAnomaly(deviceId, ipAddress, now);
  }

  return Response.json({ ok: true });
}
