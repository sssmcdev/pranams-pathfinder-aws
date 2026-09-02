/**
 * Server-side POI queries. Ported from backend/app/routers/pois.py.
 *
 * The localisation shape is unchanged: English lives in the base columns
 * and each translation in a parallel _te / _hi column, swapped in at
 * serialisation time. Only non-empty translations override, so a
 * half-translated record falls back to English per field rather than
 * showing blanks.
 */

import { and, eq, ilike, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { pois, subPlaces } from "@/db/schema";
import type { CategoryKey, Gender, Lang } from "./domain";
import type { ApiPoi, ApiSubPlace } from "./types";

type PoiRow = typeof pois.$inferSelect;
type SubPlaceRow = typeof subPlaces.$inferSelect;

function pick(base: string | null, te: string | null, hi: string | null, lang: Lang) {
  if (lang === "te") return te || base;
  if (lang === "hi") return hi || base;
  return base;
}

function toApiSubPlace(row: SubPlaceRow, lang: Lang): ApiSubPlace {
  return {
    id: row.id,
    name: pick(row.name, row.nameTe, row.nameHi, lang) ?? row.name,
    lat: row.lat,
    lon: row.lon,
    gender: (row.gender as Gender | null) ?? null,
    photo_url: row.photoUrl,
    search_terms: row.searchTerms,
  };
}

function toApiPoi(row: PoiRow, subs: SubPlaceRow[], lang: Lang): ApiPoi {
  return {
    id: row.id,
    name: pick(row.name, row.nameTe, row.nameHi, lang) ?? row.name,
    category: row.category as CategoryKey,
    facility_type: row.facilityType,
    lat: row.lat,
    lon: row.lon,
    description: pick(row.description, row.descriptionTe, row.descriptionHi, lang),
    search_terms: row.searchTerms,
    opening_hours: pick(row.openingHours, row.openingHoursTe, row.openingHoursHi, lang),
    // Derived, exactly as the SQLAlchemy model's is_open property was.
    is_open: !row.closedOverride,
    accessible: row.accessible,
    gender: (row.gender as Gender | null) ?? null,
    capacity_note: pick(row.capacityNote, row.capacityNoteTe, row.capacityNoteHi, lang),
    photo_url: row.photoUrl,
    sub_places: subs.map((s) => toApiSubPlace(s, lang)),
  };
}

export interface ListPoisOptions {
  category?: CategoryKey | null;
  q?: string | null;
  lang: Lang;
}

export async function listPois({ category, q, lang }: ListPoisOptions): Promise<ApiPoi[]> {
  const filters = [eq(pois.active, true)];
  if (category) filters.push(eq(pois.category, category));

  if (q?.trim()) {
    const needle = `%${q.trim()}%`;
    // A POI matches on its own name/terms, OR on any of its sub-places' —
    // an EXISTS subquery, same as the Python. Kept as a correlated
    // subquery rather than a join so a POI with three matching entrances
    // still yields exactly one row here; the frontend is what expands
    // those into separate result rows.
    const subMatch = sql`exists (
      select 1 from ${subPlaces}
      where ${subPlaces.poiId} = ${pois.id}
        and (${subPlaces.name} ilike ${needle} or ${subPlaces.searchTerms} ilike ${needle})
    )`;
    const nameOrTerms = or(ilike(pois.name, needle), ilike(pois.searchTerms, needle), subMatch);
    if (nameOrTerms) filters.push(nameOrTerms);
  }

  const rows = await db.select().from(pois).where(and(...filters));
  if (rows.length === 0) return [];

  // One query for every sub-place, grouped in memory — avoids N+1 without
  // the row multiplication a join would cause.
  const subs = await db.select().from(subPlaces).orderBy(subPlaces.sortOrder);
  const byPoi = new Map<string, SubPlaceRow[]>();
  for (const s of subs) {
    const list = byPoi.get(s.poiId);
    if (list) list.push(s);
    else byPoi.set(s.poiId, [s]);
  }

  return rows.map((r) => toApiPoi(r, byPoi.get(r.id) ?? [], lang));
}

export async function getPoi(id: string, lang: Lang): Promise<ApiPoi | null> {
  const [row] = await db.select().from(pois).where(and(eq(pois.id, id), eq(pois.active, true)));
  if (!row) return null;
  const subs = await db
    .select()
    .from(subPlaces)
    .where(eq(subPlaces.poiId, id))
    .orderBy(subPlaces.sortOrder);
  return toApiPoi(row, subs, lang);
}
