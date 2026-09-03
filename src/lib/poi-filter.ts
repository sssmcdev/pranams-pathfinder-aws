/**
 * Search / filter / sort for the visitor list. Ported from filteredPois()
 * and friends in frontend/app.js, kept as pure functions so the behaviour
 * can be reasoned about (and tested) without a DOM.
 */

import { PINNED_POI_ORDER, type CategoryKey } from "./domain";
import { haversineM, type LatLon } from "./geo";
import type { ApiPoi, ApiSubPlace, PoiListRow } from "./types";

export function subPlaceMatches(sub: ApiSubPlace, q: string): boolean {
  return (
    sub.name.toLowerCase().includes(q) ||
    (sub.search_terms ?? "").toLowerCase().includes(q)
  );
}

export function parentMatches(poi: ApiPoi, q: string): boolean {
  return (
    !q ||
    poi.name.toLowerCase().includes(q) ||
    (poi.search_terms ?? "").toLowerCase().includes(q)
  );
}

/**
 * Shape a sub-place (an entrance or specific facility within a POI) as its
 * own sheet target. The same merge is used both when a visitor picks an
 * entrance from the picker and when a search deep-links straight into one.
 */
export function subPlaceAsSheetTarget(poi: ApiPoi, sub: ApiSubPlace): ApiPoi {
  return {
    ...poi,
    name: `${poi.name} — ${sub.name}`,
    lat: sub.lat,
    lon: sub.lon,
    gender: sub.gender,
    photo_url: sub.photo_url || poi.photo_url,
    sub_places: [],
  };
}

export interface FilterOptions {
  pois: ApiPoi[];
  userPos: LatLon;
  activeCategory: CategoryKey | null;
  activeFacilityType: string | null;
  searchQuery: string;
}

export function filterPois({
  pois,
  userPos,
  activeCategory,
  activeFacilityType,
  searchQuery,
}: FilterOptions): PoiListRow[] {
  const pinned = activeCategory ? PINNED_POI_ORDER[activeCategory] : undefined;
  const q = searchQuery;

  const rows = pois
    .filter((p) => !activeCategory || p.category === activeCategory)
    .filter((p) => !activeFacilityType || p.facility_type === activeFacilityType)
    .flatMap((p): PoiListRow[] => {
      // A direct parent match (or idle browsing, q === "") shows the POI
      // itself, same as always.
      if (parentMatches(p, q)) {
        return [
          {
            ...p,
            distance_m: haversineM(userPos, p),
            matched_sub_place: null,
            display_name: p.name,
          },
        ];
      }
      // Otherwise EVERY matching sub-place becomes its own row — a building
      // with both a Gents and a Ladies Cloak Room needs two results for
      // "cloak", not just the first one found. Each row shows and measures
      // that sub-place, not the parent building.
      return (p.sub_places ?? []).filter((sub) => subPlaceMatches(sub, q)).map((sub) => {
        const display = subPlaceAsSheetTarget(p, sub);
        return {
          ...p,
          distance_m: haversineM(userPos, display),
          matched_sub_place: sub,
          display_name: display.name,
        };
      });
    });

  return rows.sort((a, b) => {
    if (pinned) {
      const ai = pinned.indexOf(a.id);
      const bi = pinned.indexOf(b.id);
      if (ai !== -1 || bi !== -1) {
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      }
    }
    return a.distance_m - b.distance_m;
  });
}

/**
 * The facility-type chips are shown only when the active category's actual
 * data splits into 2+ distinct types (e.g. Temple / Auditorium under
 * Spiritual Places) — one chip alone would be a filter that does nothing.
 */
export function facilityTypesInView(pois: ApiPoi[], activeCategory: CategoryKey | null): string[] {
  if (!activeCategory) return [];
  const types = new Set<string>();
  for (const p of pois) {
    if (p.category === activeCategory && p.facility_type) types.add(p.facility_type);
  }
  return types.size >= 2 ? [...types] : [];
}
