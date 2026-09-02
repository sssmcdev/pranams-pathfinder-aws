"use client";

import { CATEGORIES, type CategoryKey } from "@/lib/domain";
import { walkMinutes } from "@/lib/geo";
import type { PoiListRow } from "@/lib/types";
import { CATEGORY_ICONS } from "@/components/icons";

const CAT_COLOR = Object.fromEntries(CATEGORIES.map((c) => [c.key, c.color])) as Record<
  CategoryKey,
  string
>;

export function PoiList({
  rows,
  onOpen,
}: {
  rows: PoiListRow[];
  onOpen: (row: PoiListRow) => void;
}) {
  return (
    <div className="poi-list">
      {rows.map((row) => {
        const color = CAT_COLOR[row.category] ?? "blue";
        return (
          <button
            // A POI can appear more than once when several of its
            // sub-places match a search, so the POI id alone is not unique.
            key={`${row.id}:${row.matched_sub_place?.id ?? ""}`}
            type="button"
            className="poi-row"
            onClick={() => onOpen(row)}
          >
            <span className="ic" style={{ background: `var(--${color}-soft)`, color: `var(--${color})` }}>
              {CATEGORY_ICONS[row.category]}
            </span>
            <span className="meta">
              <span className="name">{row.display_name}</span>
              <br />
              <span className="dist">
                {Math.round(row.distance_m)} m &middot; {walkMinutes(row.distance_m)} min
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
