import type { CategoryKey } from "@/lib/domain";

/** Category glyphs, ported from the ICONS map in frontend/app.js.
 *  Stroke attributes are inherited so a parent can set the colour. */
const S = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
} as const;

export const CATEGORY_ICONS: Record<CategoryKey, React.ReactElement> = {
  mandir: (
    <svg {...S}>
      <path d="M6 20V12a6 6 0 0112 0v8" />
      <path d="M4 20h16" />
    </svg>
  ),
  accommodation: (
    <svg {...S}>
      <path d="M3 18v-6a2 2 0 012-2h14a2 2 0 012 2v6" />
      <path d="M3 18h18" />
      <path d="M6 10V7a1 1 0 011-1h3a1 1 0 011 1v3" />
    </svg>
  ),
  spiritual_places: (
    <svg {...S}>
      <path d="M4 20h16" />
      <path d="M6 20V10" />
      <path d="M18 20V10" />
      <path d="M4 10l8-6 8 6" />
    </svg>
  ),
  water_restrooms: (
    <svg {...S}>
      <path d="M12 3C12 3 6 11 6 15a6 6 0 0012 0c0-4-6-12-6-12z" />
    </svg>
  ),
  canteens_shopping: (
    <svg {...S}>
      <path d="M4 8h16l-1 11a2 2 0 01-2 2H7a2 2 0 01-2-2L4 8z" />
      <path d="M8 8V6a4 4 0 018 0v2" />
    </svg>
  ),
  library: (
    <svg {...S}>
      <path d="M4 5c3-1 6-1 8 1v13c-2-2-5-2-8-1V5z" />
      <path d="M20 5c-3-1-6-1-8 1v13c2-2 5-2 8-1V5z" />
    </svg>
  ),
  offices: (
    <svg {...S}>
      <rect x="3" y="8" width="18" height="12" rx="2" />
      <path d="M8 8V6a2 2 0 012-2h4a2 2 0 012 2v2" />
      <path d="M3 13h18" />
    </svg>
  ),
  gates: (
    <svg {...S}>
      <path d="M4 20V6a2 2 0 012-2h12a2 2 0 012 2v14" />
      <path d="M4 20h16" />
      <path d="M9 20V11" />
      <path d="M15 20V11" />
    </svg>
  ),
  wheelchair_buggy: (
    <svg {...S}>
      <circle cx="9" cy="18" r="3.5" />
      <path d="M9 18V5h4" />
      <path d="M9 11h5l3.5 7" />
    </svg>
  ),
};

export const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </svg>
);

export const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export const MenuIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

export const BackIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
);
