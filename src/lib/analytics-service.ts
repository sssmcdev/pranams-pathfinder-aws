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

/** How long a gap between one device's logged searches can be before it
 *  counts as a new search rather than a continuation of the same typing
 *  burst. See topSearches in getDashboard(). */
const BURST_GAP_SECONDS = 10;

/** db.execute() is untyped by design (raw SQL). This narrows the result in
 *  one place rather than scattering double-casts through every query. */
function rows<T>(result: unknown): T[] {
  return result as T[];
}

export const RANGES = ["today", "7d", "30d", "90d", "all"] as const;
export type Range = (typeof RANGES)[number];

export const GRANULARITIES = ["hour", "day", "week", "month"] as const;
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
  // Space-separated from the date on purpose — bucketLabel() in charts.tsx
  // tells hour buckets apart from day buckets by checking for that space,
  // rather than needing a 4th, differently-shaped format to parse.
  if (granularity === "hour") return sql`to_char(${local}, 'YYYY-MM-DD HH24:00')`;
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

  // The search box logs one event per settled (debounced) keystroke pause,
  // not one per finished thought — typing "shopping" with a couple of
  // natural pauses logs "sho", then "shopping", as two separate events for
  // the same device. Counting raw rows here would show "Top searches" as a
  // pile of prefixes of the same word. Instead: collapse each device's
  // rapid-fire run of searches (gaps under BURST_GAP_SECONDS) down to only
  // its last, and count final search terms, not every intermediate one.
  const topSearches = await db.execute(sql`
      with search_events as (
        select device_id, search_query, created_at::timestamptz as ts
        from analytics_events
        where event_type = 'search' and search_query is not null and device_id is not null
          and ${windowFilter(start, null)}
      ),
      gapped as (
        select *,
          extract(epoch from ts - lag(ts) over (partition by device_id order by ts)) as gap_seconds
        from search_events
      ),
      bursts as (
        select *,
          sum(case when gap_seconds is null or gap_seconds > ${BURST_GAP_SECONDS} then 1 else 0 end)
            over (partition by device_id order by ts) as burst_id
        from gapped
      ),
      finals as (
        select distinct on (device_id, burst_id) device_id, burst_id, search_query
        from bursts
        order by device_id, burst_id, ts desc
      )
      select search_query as query, count(*)::int as count
      from finals
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

export interface VisitRow {
  id: string;
  device_id: string;
  scanned_at: string;
  from_lat: number;
  from_lon: number;
  directions_poi_id: string | null;
  destination_name: string | null;
  to_lat: number | null;
  to_lon: number | null;
  directions_at: string | null;
}

/**
 * One row per "open" event (a visitor loading the app — a "scan", since
 * the QR code at each physical location is what most visitors use to get
 * there) with its location, plus whichever "directions" request from the
 * same device came next, if any, so an admin can see both where someone
 * was and where they then asked to go.
 *
 * "Next" is bounded by that device's *next* open event (via LEAD) so a
 * direction request from a visitor's following, unrelated visit hours
 * later never gets attached to this one. A device's very last visit has
 * no upper bound — any later direction request is fair game.
 *
 * No range filter: this is a browse/audit log, not a trend panel — it is
 * paginated instead, newest first.
 */
export async function getVisits(limit: number, offset: number) {
  const totalResult = await db.execute(sql`
    select count(*)::int as count from analytics_events
    where event_type = 'open' and device_id is not null and lat is not null and lon is not null`);
  const total = rows<{ count: number }>(totalResult)[0]?.count ?? 0;

  const visits = await db.execute(sql`
    with opens as (
      select id, device_id, lat, lon, created_at::timestamptz as ts,
        lead(created_at::timestamptz) over (partition by device_id order by created_at::timestamptz)
          as next_open_ts
      from analytics_events
      where event_type = 'open' and device_id is not null and lat is not null and lon is not null
    )
    select
      o.id, o.device_id, o.lat as from_lat, o.lon as from_lon, o.ts as scanned_at,
      d.poi_id as directions_poi_id, p.name as destination_name,
      p.lat as to_lat, p.lon as to_lon, d.ts as directions_at
    from opens o
    left join lateral (
      select poi_id, created_at::timestamptz as ts
      from analytics_events
      where event_type = 'directions' and device_id = o.device_id and created_at::timestamptz >= o.ts
        and (o.next_open_ts is null or created_at::timestamptz < o.next_open_ts)
      order by created_at::timestamptz asc
      limit 1
    ) d on true
    left join pois p on p.id = d.poi_id
    order by o.ts desc
    limit ${limit} offset ${offset}`);

  return { visits: rows<VisitRow>(visits), total };
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
