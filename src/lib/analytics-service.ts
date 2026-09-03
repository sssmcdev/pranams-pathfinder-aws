import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/db";
import { CATEGORY_ADMIN_LABELS, type CategoryKey } from "./domain";

/**
 * Dashboard aggregation, ported from backend/app/routers/analytics.py.
 *
 * DELIBERATELY NOT a faithful port. The Python loaded every event in the
 * window into memory and aggregated with collections.Counter, which on a
 * serverless runtime is a latency and memory liability that grows without
 * bound — "all time" would eventually pull years of rows into one
 * function invocation. Every panel below is a GROUP BY instead, so the
 * work happens in Postgres and only the summary crosses the wire.
 *
 * The IST rule is preserved exactly: every visitor and admin is in India,
 * so displayed dates are IST calendar days. Events are still STORED in
 * UTC; the timezone is applied only when bucketing or filtering.
 *
 * created_at is a varchar of ISO-8601 (inherited from the SQLAlchemy
 * schema — see db/schema.ts). It is cast to timestamptz here rather than
 * compared as a string, because the old Python writer emitted "+00:00"
 * and this app emits "Z", which do not sort against each other reliably.
 * The cast means the btree index on created_at is not used; at the
 * current data size that is irrelevant, and the real fix is migrating the
 * column to timestamptz.
 */

const IST = "Asia/Kolkata";

/** db.execute() is untyped by design (raw SQL). This narrows the result in
 *  one place rather than scattering double-casts through every query. */
function rows<T>(result: unknown): T[] {
  return result as T[];
}

export const RANGES = ["today", "7d", "30d", "90d", "all"] as const;
export type Range = (typeof RANGES)[number];

export const GRANULARITIES = ["day", "week", "month"] as const;
export type Granularity = (typeof GRANULARITIES)[number];

const RANGE_DAYS: Record<Exclude<Range, "today" | "all">, number> = { "7d": 7, "30d": 30, "90d": 90 };

export function isRange(v: unknown): v is Range {
  return RANGES.includes(v as Range);
}
export function isGranularity(v: unknown): v is Granularity {
  return GRANULARITIES.includes(v as Granularity);
}

interface Window {
  start: Date | null;
  prevStart: Date | null;
  /** null for "all", where a previous-period delta is meaningless. */
  hasComparison: boolean;
}

function resolveWindow(range: Range, now = new Date()): Window {
  if (range === "all") return { start: null, prevStart: null, hasComparison: false };

  if (range === "today") {
    // "Today" is the current IST calendar day, not a rolling 24 hours — a
    // rolling window straddles IST midnight and pulls in part of
    // yesterday, which is what made "Today" bucket under yesterday's date.
    const istNow = new Date(now.toLocaleString("en-US", { timeZone: IST }));
    const offsetMs = now.getTime() - istNow.getTime();
    const istMidnight = new Date(istNow);
    istMidnight.setHours(0, 0, 0, 0);
    const start = new Date(istMidnight.getTime() + offsetMs);
    const elapsed = now.getTime() - start.getTime();
    return { start, prevStart: new Date(start.getTime() - elapsed), hasComparison: true };
  }

  const days = RANGE_DAYS[range];
  const start = new Date(now.getTime() - days * 86_400_000);
  return { start, prevStart: new Date(start.getTime() - days * 86_400_000), hasComparison: true };
}

/** SQL fragment: the event's IST bucket label for the chosen granularity. */
function bucketExpr(granularity: Granularity) {
  const local = sql`(created_at::timestamptz AT TIME ZONE ${IST})`;
  if (granularity === "month") return sql`to_char(${local}, 'YYYY-MM')`;
  if (granularity === "week") return sql`to_char(${local}, 'IYYY-"W"IW')`;
  return sql`to_char(${local}, 'YYYY-MM-DD')`;
}

function windowFilter(start: Date | null, end: Date | null) {
  const parts = [sql`true`];
  if (start) parts.push(sql`and created_at::timestamptz >= ${start.toISOString()}`);
  if (end) parts.push(sql`and created_at::timestamptz < ${end.toISOString()}`);
  return sql.join(parts, sql` `);
}

export interface DashboardResult {
  totals: Record<string, { value: number; delta_pct: number | null }>;
  timeseries: { bucket: string; count: number }[];
  top_pois: { poi_id: string; name: string; category: string | null; views: number; directions: number }[];
  top_searches: { query: string; count: number }[];
  categories: { category: string; label: string; count: number }[];
  map_points: { lat: number; lon: number }[];
}

export async function getDashboard(
  range: Range,
  granularity: Granularity,
  category: string | null,
): Promise<DashboardResult> {
  const { start, prevStart, hasComparison } = resolveWindow(range);

  // The category filter narrows POI-related panels only — app opens and
  // searches have no category of their own, so they stay global.
  const catFilter = category ? sql`and category = ${category}` : sql``;

  // Sequential, NOT Promise.all. The db client is max:1 (see db/index.ts)
  // and concurrent queries pipelined onto one connection deadlock against
  // Supavisor's transaction pooler. Measured cost of serialising all seven
  // aggregates: ~120ms, against a hang that never resolves.
  const totalsNow = await db.execute(sql`
      select
        count(*) filter (where event_type = 'open')                        as hits,
        count(*) filter (where event_type = 'search')                      as searches,
        count(*) filter (where event_type = 'poi_view' ${catFilter})       as poi_views,
        count(*) filter (where event_type = 'directions' ${catFilter})     as directions
      from analytics_events where ${windowFilter(start, null)}`);

  const totalsPrev =
    hasComparison && prevStart && start
      ? await db.execute(sql`
          select
            count(*) filter (where event_type = 'open')                    as hits,
            count(*) filter (where event_type = 'search')                  as searches,
            count(*) filter (where event_type = 'poi_view' ${catFilter})   as poi_views,
            count(*) filter (where event_type = 'directions' ${catFilter}) as directions
          from analytics_events where ${windowFilter(prevStart, start)}`)
      : [{ hits: 0, searches: 0, poi_views: 0, directions: 0 }];

  const now = rows<Record<string, number>>(totalsNow)[0] ?? {};
  const prev = rows<Record<string, number>>(totalsPrev)[0] ?? {};

  const deltaPct = (curr: number, before: number): number | null => {
    if (!hasComparison) return null;
    if (before === 0) return curr === 0 ? null : 100;
    return Math.round(((curr - before) / before) * 1000) / 10;
  };

  const totals: DashboardResult["totals"] = {};
  for (const key of ["hits", "poi_views", "directions", "searches"] as const) {
    const value = Number(now[key] ?? 0);
    totals[key] = { value, delta_pct: deltaPct(value, Number(prev[key] ?? 0)) };
  }

  const timeseries = await db.execute(sql`
      select ${bucketExpr(granularity)} as bucket, count(*)::int as count
      from analytics_events
      where event_type = 'open' and ${windowFilter(start, null)}
      group by 1 order by 1`);

  // Joined to pois so a deleted POI still shows its id rather than
    // vanishing — analytics_events.poi_id is deliberately not a foreign
  // key, so orphaned events are expected.
  const topPois = await db.execute(sql`
      select e.poi_id,
             coalesce(p.name, e.poi_id)                                   as name,
             p.category                                                   as category,
             count(*) filter (where e.event_type = 'poi_view')::int       as views,
             count(*) filter (where e.event_type = 'directions')::int     as directions
      from analytics_events e
      left join pois p on p.id = e.poi_id
      where e.poi_id is not null
        and e.event_type in ('poi_view','directions')
        and ${windowFilter(start, null)} ${catFilter}
      group by e.poi_id, p.name, p.category
      order by (count(*) filter (where e.event_type = 'poi_view')
              + count(*) filter (where e.event_type = 'directions')) desc
      limit 10`);

  const topSearches = await db.execute(sql`
      select search_query as query, count(*)::int as count
      from analytics_events
      where event_type = 'search' and search_query is not null and ${windowFilter(start, null)}
      group by 1 order by 2 desc, 1 limit 10`);

  const categories = await db.execute(sql`
      select category, count(*)::int as count
      from analytics_events
      where event_type = 'category' and category is not null and ${windowFilter(start, null)}
      group by 1 order by 2 desc`);

  const mapPoints = await db.execute(sql`
      select lat, lon from analytics_events
      where event_type = 'open' and lat is not null and lon is not null
        and ${windowFilter(start, null)}`);

  return {
    totals,
    timeseries: rows<DashboardResult["timeseries"][number]>(timeseries),
    top_pois: rows<DashboardResult["top_pois"][number]>(topPois),
    top_searches: rows<DashboardResult["top_searches"][number]>(topSearches),
    categories: rows<{ category: string; count: number }>(categories).map((c) => ({
      ...c,
      label: CATEGORY_ADMIN_LABELS[c.category as CategoryKey] ?? c.category,
    })),
    map_points: rows<DashboardResult["map_points"][number]>(mapPoints),
  };
}

/**
 * Deliberately NOT subject to the range filters — this is always "who is
 * roughly active right now". Location only exists for devices with a
 * recent "open" event (lat/lon is captured there), so a device that only
 * searched without a fresh fix has nothing to plot; that is reported
 * honestly rather than guessed at.
 */
export async function getActiveDevices() {
  const windowStart = new Date(Date.now() - 3_600_000).toISOString();

  // DISTINCT ON picks the latest located event per device in one pass —
  // the Python did this by sorting everything and keeping first-seen.
  const devices = await db.execute(sql`
    with located as (
      select distinct on (device_id) device_id, lat, lon, created_at
      from analytics_events
      where device_id is not null and lat is not null and lon is not null
        and created_at::timestamptz >= ${windowStart}
      order by device_id, created_at::timestamptz desc
    ),
    searches as (
      select device_id, count(*)::int as search_count
      from analytics_events
      where device_id is not null and event_type = 'search'
        and created_at::timestamptz >= ${windowStart}
      group by device_id
    )
    select l.device_id, l.lat, l.lon, l.created_at as last_seen,
           coalesce(s.search_count, 0) as search_count
    from located l left join searches s using (device_id)`);

  return {
    devices: rows<{
      device_id: string; lat: number; lon: number; last_seen: string; search_count: number;
    }>(devices),
    window_minutes: 60,
  };
}
