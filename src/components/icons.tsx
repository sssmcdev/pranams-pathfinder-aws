import type { CategoryKey, FacilityTypeKey } from "@/lib/domain";

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

/**
 * A glyph per facility type, so a category that bundles several kinds of
 * place reads as several kinds of place. Without these, every chip in the
 * filter row — and every row in the list beneath it — carried the parent
 * category's icon, which made "Water" and "Restroom" look like the same
 * thing right next to each other.
 *
 * Two constraints shaped these drawings:
 *
 *  1. They render at 14px in a list row, so detail costs legibility.
 *     Simple silhouettes, no more than a handful of strokes each.
 *  2. The "All" chip keeps the *category* icon, and sits immediately to
 *     the left of the type chips. So where the obvious drawing for a type
 *     is the one the category already uses, the type takes a different
 *     one — Room is a door rather than a second bed, Water is a tap
 *     rather than a second droplet, Shopping is a trolley rather than a
 *     second bag, Library is a shelf rather than a second open book.
 *
 * `Record<FacilityTypeKey, …>` rather than a partial map on purpose: it
 * matches how CATEGORY_FACILITY_TYPES is declared in domain.ts, so adding
 * a facility type without drawing it is a compile error and never a blank
 * chip on a phone.
 */
export const FACILITY_ICONS: Record<FacilityTypeKey, React.ReactElement> = {
  // -- accommodation ---------------------------------------------------
  dormitory: (
    // Bunk beds: two mattress levels between the posts.
    <svg {...S}>
      <path d="M4 3v18" />
      <path d="M20 8v13" />
      <path d="M4 8h16" />
      <path d="M4 15h16" />
    </svg>
  ),
  room: (
    // A door, not a bed — the category tile is already a bed.
    <svg {...S}>
      <path d="M6 3h12v18H6z" />
      <circle cx="15" cy="12" r="1" />
    </svg>
  ),
  guest_house: (
    <svg {...S}>
      <path d="M4 10l8-6 8 6v10H4V10z" />
      <path d="M10 20v-6h4v6" />
    </svg>
  ),

  // -- spiritual_places ------------------------------------------------
  auditorium: (
    // A stage screen above rows of seating.
    <svg {...S}>
      <path d="M3 4h18v9H3z" />
      <path d="M5 17h14" />
      <path d="M5 20h14" />
    </svg>
  ),
  temple: (
    // A tiered gopuram. The obvious single-roof drawing came out as a
    // plain house, indistinguishable from Guest House one category over;
    // the narrow spire above a second tier is what makes it a temple.
    <svg {...S}>
      <path d="M12 2l3 4H9l3-4z" />
      <path d="M8.5 6h7l1.5 4H7l1.5-4z" />
      <path d="M6 21V10h12v11" />
      <path d="M10 21v-5h4v5" />
    </svg>
  ),
  convention_hall: (
    // Domed hall.
    <svg {...S}>
      <path d="M4 21v-8a8 8 0 0116 0v8" />
      <path d="M3 21h18" />
      <path d="M10 21v-6h4v6" />
    </svg>
  ),

  // -- water_restrooms -------------------------------------------------
  water: (
    // A tap; the category tile owns the droplet.
    <svg {...S}>
      <path d="M3 9h5" />
      <path d="M8 5v8" />
      <path d="M8 9h8v4" />
      <path d="M16 15.5c-1.3 1.6-2 2.5-2 3.4a2 2 0 004 0c0-.9-.7-1.8-2-3.4z" />
    </svg>
  ),
  restroom: (
    // The cistern is what makes this a toilet rather than a wine glass:
    // a rounded bowl on a pedestal alone reads as stemware at 14px.
    <svg {...S}>
      <path d="M4 3h5v7H4z" />
      <path d="M3 10h17v1a6 6 0 01-6 6H9a6 6 0 01-6-6v-1z" />
      <path d="M8 17v4" />
      <path d="M5 21h8" />
    </svg>
  ),

  // -- canteens_shopping -----------------------------------------------
  canteen: (
    // Fork and knife.
    <svg {...S}>
      <path d="M7 3v5a2.5 2.5 0 005 0V3" />
      <path d="M9.5 10.5V21" />
      <path d="M17 3c2 2.5 2 6.5 0 9v9" />
    </svg>
  ),
  refreshments_snacks: (
    // A cold drink with a straw — a cup, but not the coffee cup below.
    <svg {...S}>
      <path d="M6 6h12l-1.5 14h-9L6 6z" />
      <path d="M13.5 6L17 2.5" />
      <path d="M6.6 11h10.8" />
    </svg>
  ),
  shopping: (
    // A trolley; the category tile owns the bag.
    <svg {...S}>
      <path d="M2 4h2.5l2.8 11h10.4L21 7H6.2" />
      <circle cx="9" cy="19.5" r="1.6" />
      <circle cx="17" cy="19.5" r="1.6" />
    </svg>
  ),
  coffee_kiosk: (
    <svg {...S}>
      <path d="M4 9h13v5a5 5 0 01-5 5H9a5 5 0 01-5-5V9z" />
      <path d="M17 10.5h1.5a2.5 2.5 0 010 5H17" />
      <path d="M8 3v2.5" />
      <path d="M12.5 3v2.5" />
    </svg>
  ),

  // -- library ---------------------------------------------------------
  library: (
    // A shelf of books; the category tile owns the open book.
    <svg {...S}>
      <path d="M4 4h4v16H4z" />
      <path d="M10 7h4v13h-4z" />
      <path d="M16 5h4v15h-4z" />
    </svg>
  ),
  books_photos: (
    <svg {...S}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="10" r="1.5" />
      <path d="M21 16l-5-5-6 6" />
    </svg>
  ),

  // -- offices ---------------------------------------------------------
  pro: (
    // Information point.
    <svg {...S}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5" />
      <circle cx="12" cy="7.6" r="0.9" />
    </svg>
  ),
  central_trust: (
    // Columned institution.
    <svg {...S}>
      <path d="M2 10l10-6 10 6H2z" />
      <path d="M5 10v10" />
      <path d="M12 10v10" />
      <path d="M19 10v10" />
      <path d="M3 20h18" />
    </svg>
  ),
  sadhana_trust: (
    // A lit diya.
    <svg {...S}>
      <path d="M12 3s3.5 3.8 3.5 6.5a3.5 3.5 0 01-7 0C8.5 6.8 12 3 12 3z" />
      <path d="M4 15h16a8 8 0 01-16 0z" />
    </svg>
  ),
  police_station: (
    // A star badge. Deliberately not a shield: Security Office next to it
    // is the shield, and two shields would be the bug this file fixes.
    <svg {...S}>
      <path d="M12 2.5l2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.8-5.4 2.8 1-6L3.3 8.9l6-.9L12 2.5z" />
    </svg>
  ),
  security_office: (
    <svg {...S}>
      <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" />
      <path d="M8.5 12l2.5 2.5 4.5-4.5" />
    </svg>
  ),

  // -- gates -----------------------------------------------------------
  gate: (
    // Gates is a single-type category, so this never appears as a chip —
    // only on the list rows, where a barred gate reads at 14px.
    <svg {...S}>
      <path d="M3 5v15" />
      <path d="M21 5v15" />
      <path d="M3 8h18" />
      <path d="M3 16h18" />
      <path d="M9 8v8" />
      <path d="M15 8v8" />
    </svg>
  ),

  // -- wheelchair_buggy ------------------------------------------------
  wheelchair: (
    // Mirrored against the category tile's chair, with a hubbed wheel, so
    // the "All" chip and the "Wheelchair Point" chip do not read alike.
    <svg {...S}>
      <circle cx="14" cy="17.5" r="4.5" />
      <circle cx="14" cy="17.5" r="1.3" />
      <path d="M14 13V4h-4" />
      <path d="M14 9H9l-3.5 6" />
    </svg>
  ),
  buggy: (
    <svg {...S}>
      <path d="M4 4h14" />
      <path d="M5 4v6" />
      <path d="M17 4v6" />
      <path d="M3 10h18v5H3z" />
      <circle cx="7" cy="18" r="2.2" />
      <circle cx="17" cy="18" r="2.2" />
    </svg>
  ),
  cloak_room: (
    // Coat hanger.
    <svg {...S}>
      <path d="M10 6.5a2 2 0 114 0c0 1.5-2 1.5-2 3v2.5" />
      <path d="M12 12l9 6H3l9-6z" />
    </svg>
  ),
};

/**
 * The glyph for one place: its facility type's own icon, falling back to
 * the category's.
 *
 * The fallback is not defensive padding — it is load-bearing. `mandir` has
 * no facility types at all, `facility_type` is nullable on every POI, and
 * the column is free text as far as this code is concerned (it arrives
 * from the API as `string | null`), so a record whose type was retired in
 * the admin panel still gets its category's icon rather than a hole.
 */
export function facilityIcon(
  category: CategoryKey,
  facilityType: string | null,
): React.ReactElement {
  return FACILITY_ICONS[facilityType as FacilityTypeKey] ?? CATEGORY_ICONS[category];
}

/** The "Others" category tile. Filled dots rather than the stroked style
 *  the category glyphs use — an outlined dot at 19px is a smudge. */
export const EllipsisIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <circle cx="5" cy="12" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="19" cy="12" r="2" />
  </svg>
);

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
