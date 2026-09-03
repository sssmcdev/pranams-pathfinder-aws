"use client";

import { CATEGORIES, categoryLabel, type CategoryKey } from "@/lib/domain";
import { useLang } from "@/components/LangProvider";
import { CATEGORY_ICONS } from "@/components/icons";

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
  const visible = expanded ? CATEGORIES : CATEGORIES.filter((c) => c.primary);

  return (
    <>
      <div className="cat-grid">
        {visible.map((cat) => {
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
              <span>{label}</span>
            </button>
          );
        })}
      </div>
      <button type="button" className="more-cats-toggle" onClick={onToggleExpanded}>
        {expanded ? t("fewer_categories") : t("more_categories")}
      </button>
    </>
  );
}
