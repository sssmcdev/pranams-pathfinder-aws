"use client";

import { CATEGORIES, categoryLabel, type CategoryKey } from "@/lib/domain";
import { useLang } from "@/components/LangProvider";
import { CATEGORY_ICONS, EllipsisIcon } from "@/components/icons";

const PRIMARY = CATEGORIES.filter((c) => c.primary);
const SECONDARY = CATEGORIES.filter((c) => !c.primary);

/**
 * Five category tiles, then an "Others" tile that expands the rest in
 * place.
 *
 * This replaced a "More categories ▾" text link under the grid. The link
 * was the only way to reach four of the nine categories and it read as
 * page furniture, so visitors browsed as though the app had five. A tile
 * shaped like every other tile, sitting in the grid where the eye is
 * already going, is much harder to skip.
 *
 * The tile keeps its slot when open rather than moving to the end: it is
 * the control that opened the extra tiles, so the second tap to close
 * them lands where the first tap was.
 */
export function CategoryGrid({
  activeCategory,
  expanded,
  onToggleExpanded,
  onPick,
}: {
  activeCategory: CategoryKey | null;
  expanded: boolean;
  onToggleExpanded: () => void;
  onPick: (key: CategoryKey) => void;
}) {
  const { lang, t } = useLang();

  const tile = (cat: (typeof CATEGORIES)[number]) => {
    const label = categoryLabel(cat.key, lang);
    return (
      <button
        key={cat.key}
        type="button"
        className={`cat-tile${activeCategory === cat.key ? " active" : ""}`}
        title={label}
        style={{ background: `var(--${cat.color}-soft)` }}
        onClick={() => onPick(cat.key)}
      >
        <span className="ic" style={{ background: "var(--pink)", color: "#fff" }}>
          {CATEGORY_ICONS[cat.key]}
        </span>
        <span className="cat-label">{label}</span>
      </button>
    );
  };

  return (
    <div className="cat-grid">
      {PRIMARY.map(tile)}

      <button
        type="button"
        className={`cat-tile cat-tile-others${expanded ? " open" : ""}`}
        title={t("other_categories")}
        aria-expanded={expanded}
        onClick={onToggleExpanded}
      >
        <span className="ic">
          <EllipsisIcon />
        </span>
        <span className="cat-label">{t("other_categories")}</span>
      </button>

      {expanded && SECONDARY.map(tile)}
    </div>
  );
}
