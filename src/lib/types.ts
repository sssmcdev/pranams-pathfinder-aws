/**
 * The API-facing shapes, mirroring the Pydantic models in
 * backend/app/models.py. These are what /pois returns — deliberately NOT
 * the database row types in db/schema.ts: the API exposes a localized,
 * trimmed view (no _te/_hi columns, no maps_url, no closed_override; the
 * derived `is_open` instead).
 *
 * snake_case is kept on purpose. It is the existing API contract, and
 * matching it exactly means the ported frontend and the Python one can be
 * diffed against the same payload during the migration.
 */

import type { CategoryKey, Gender } from "./domain";

export interface ApiSubPlace {
  id: string;
  name: string;
  lat: number;
  lon: number;
  gender: Gender | null;
  photo_url: string | null;
  search_terms: string | null;
}

export interface ApiPoi {
  id: string;
  name: string;
  category: CategoryKey;
  facility_type: string | null;
  lat: number;
  lon: number;
  description: string | null;
  search_terms: string | null;
  opening_hours: string | null;
  is_open: boolean;
  accessible: boolean;
  gender: Gender | null;
  capacity_note: string | null;
  photo_url: string | null;
  sub_places: ApiSubPlace[];
}

/** A row in the visitor's list: a POI, or one of its sub-places surfaced
 *  as its own result by a search. */
export interface PoiListRow extends ApiPoi {
  distance_m: number;
  /** Non-null when this row represents a matched sub-place, not the POI. */
  matched_sub_place: ApiSubPlace | null;
  /** What to show — the sub-place's composed name, or the POI's own. */
  display_name: string;
}
