"use client";

import { CATEGORIES, facilityTypeLabel, type CategoryKey } from "@/lib/domain";
import { useLang } from "@/components/LangProvider";
import { CATEGORY_ICONS, facilityIcon } from "@/components/icons";

const CAT_COLOR = Object.fromEntries(CATEGORIES.map((c) => [c.key, c.color])) as Record<
  CategoryKey,
  "pink" | "blue" | "yellow"
>;

/**
 * Shown only when the active category's data splits into 2+ distinct
 * facility types — narrows the list in place. Tapping the active chip
 * again clears back to the full category, the same toggle convention the
 * category tiles use.
 */
export function FacilityFilters({
  activeCategory,
  types,
  activeFacilityType,
  onPick,
}: {
  activeCategory: CategoryKey;
  types: string[];
  activeFacilityType: string | null;
  onPick: (type: string | null) => void;
}) {
  const { lang, t } = useLang();
  if (types.length < 2) return null;

  const catColor = CAT_COLOR[activeCategory];
  // Type chips deliberately contrast with the category's own colour (used
  // by "All" and by every POI row), so a filter never reads as a place.
  const filterColor = catColor === "blue" ? "pink" : "blue";

  // Each type carries its own glyph — the point of the row is telling the
  // types apart, which one shared category icon actively worked against.
  // "All" is the exception: it stands for the whole category, so it keeps
  // the category's icon just as it keeps the category's colour.
  const chip = (
    key: string,
    label: string,
    color: string,
    icon: React.ReactElement,
    active: boolean,
    onClick: () => void,
  ) => (
    <button key={key} type="button" className={`facility-chip${active ? " active" : ""}`} onClick={onClick}>
      <span className="ic" style={{ background: `var(--${color}-soft)`, color: `var(--${color})` }}>
        {icon}
      </span>
      <span className="chip-label">{label}</span>
    </button>
  );

  return (
    <div className="facility-filter-row">
      {chip(
        "__all",
        t("filter_all"),
        catColor,
        CATEGORY_ICONS[activeCategory],
        activeFacilityType === null,
        () => onPick(null),
      )}
      {types.map((type) =>
        chip(
          type,
          facilityTypeLabel(type, lang),
          filterColor,
          facilityIcon(activeCategory, type),
          activeFacilityType === type,
          () => onPick(activeFacilityType === type ? null : type),
        ),
      )}
    </div>
  );
}
