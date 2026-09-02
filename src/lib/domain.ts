/**
 * The shared vocabulary of the app: categories, facility types, gender.
 *
 * This file is the single source of truth that replaces THREE copies of
 * the same vocabulary in the Python app:
 *   - backend/app/models.py      Category, CATEGORY_LABELS,
 *                                CATEGORY_FACILITY_TYPES, FACILITY_TYPE_LABELS
 *   - frontend/app.js            CATS, FACILITY_TYPE_LABELS  (carried the
 *                                comment "Keep in sync with backend")
 *   - backend/app/admin.py       ALL_FACILITY_TYPES, derived from the above
 *
 * Keeping them in sync was manual there. Here the types enforce it: a
 * category with no facility-type list, or a facility type with no label,
 * is a compile error rather than a blank dropdown at runtime.
 */

export const LANGS = ["en", "te", "hi"] as const;
export type Lang = (typeof LANGS)[number];

/** A string that must exist in all three languages. */
export type Localized = Record<Lang, string>;

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

/**
 * `primary: true` -> one of the 6 tiles shown by default (2 rows of 3).
 * The rest appear only once "More categories" is expanded.
 *
 * `color` keys into the --pink / --blue / --yellow custom properties in
 * frontend/styles.css.
 */
export const CATEGORIES = [
  {
    key: "mandir",
    color: "pink",
    primary: true,
    labels: {
      en: "Mandir (Sai Kulwant Hall)",
      te: "మందిర్ (సాయి కుల్వంత్ హాల్)",
      hi: "मंदिर (साईं कुलवंत हॉल)",
    },
  },
  {
    key: "spiritual_places",
    color: "pink",
    primary: true,
    labels: {
      en: "Other Temples",
      te: "ఆధ్యాత్మిక ప్రదేశాలు, ఇతర దేవాలయాలు & ఆడిటోరియంలు",
      hi: "आध्यात्मिक स्थल, अन्य मंदिर एवं सभागार",
    },
  },
  {
    key: "accommodation",
    color: "yellow",
    primary: true,
    labels: {
      en: "Stay & Accommodation",
      te: "వసతి & అతిథి గృహాలు",
      hi: "आवास एवं अतिथि गृह",
    },
  },
  {
    key: "water_restrooms",
    color: "blue",
    primary: true,
    labels: {
      en: "Water & Restrooms",
      te: "నీరు & విశ్రాంతి గదులు",
      hi: "पानी एवं शौचालय",
    },
  },
  {
    key: "canteens_shopping",
    color: "yellow",
    primary: true,
    labels: {
      en: "Food & Shopping",
      te: "క్యాంటీన్లు, ఫలహారాలు & షాపింగ్",
      hi: "कैंटीन, जलपान और खरीदारी",
    },
  },
  {
    key: "gates",
    color: "blue",
    primary: true,
    labels: {
      en: "Gates",
      te: "ప్రవేశ/నిష్క్రమణ గేట్లు",
      hi: "प्रवेश/निकास द्वार",
    },
  },
  {
    key: "library",
    color: "yellow",
    primary: false,
    labels: {
      en: "Library, Books & Photos",
      te: "లైబ్రరీ & బుక్ స్టాల్స్",
      hi: "पुस्तकालय एवं पुस्तक स्टॉल",
    },
  },
  {
    key: "offices",
    color: "blue",
    primary: false,
    labels: {
      en: "Important Offices",
      te: "కార్యాలయాలు - PRO, సెంట్రల్ ట్రస్ట్, సాధన ట్రస్ట్, పోలీస్ స్టేషన్, భద్రతా కార్యాలయం",
      hi: "कार्यालय - पीआरओ, सेंट्रल ट्रस्ट, साधना ट्रस्ट, पुलिस स्टेशन, सुरक्षा कार्यालय",
    },
  },
  {
    key: "wheelchair_buggy",
    color: "blue",
    primary: false,
    labels: {
      en: "Wheelchair, Buggy, Cloak Room",
      te: "వీల్‌చైర్, బగ్గీ & క్లోక్ రూమ్ పాయింట్లు",
      hi: "व्हीलचेयर, बग्गी एवं क्लोक रूम पॉइंट",
    },
  },
] as const satisfies readonly {
  key: string;
  color: "pink" | "blue" | "yellow";
  primary: boolean;
  labels: Localized;
}[];

export type CategoryKey = (typeof CATEGORIES)[number]["key"];
export type CategoryColor = (typeof CATEGORIES)[number]["color"];

export const CATEGORY_KEYS = CATEGORIES.map((c) => c.key) as readonly CategoryKey[];

const CATEGORY_BY_KEY = new Map(CATEGORIES.map((c) => [c.key, c]));

export function isCategoryKey(value: unknown): value is CategoryKey {
  return typeof value === "string" && CATEGORY_BY_KEY.has(value as CategoryKey);
}

/** The visitor-facing tile label — short, and translated. */
export function categoryLabel(key: string, lang: Lang): string {
  const cat = CATEGORY_BY_KEY.get(key as CategoryKey);
  return cat ? cat.labels[lang] || cat.labels.en : key;
}

/**
 * The long, descriptive English label, used where there is room to be
 * explicit and the audience is an admin rather than a visitor: the admin
 * category dropdown and the analytics "Category interest" panel.
 *
 * These are NOT the tile labels above. The visitor-facing English was
 * deliberately shortened (commits 257c934, 84485b2) while these stayed
 * long, so collapsing the two sets would silently change both screens.
 * Mirrors CATEGORY_LABELS in backend/app/models.py.
 */
export const CATEGORY_ADMIN_LABELS = {
  mandir: "Mandir (Sai Kulwant Hall)",
  accommodation: "Accommodation & Guest Houses",
  spiritual_places: "Spiritual Places, Other Temples & Auditoriums",
  water_restrooms: "Water & Restrooms",
  canteens_shopping: "Canteens, Refreshments & Shopping",
  library: "Library & Book Stalls",
  offices:
    "Offices - PRO, Central Trust, Sadhana Trust, Police Station, Security Office",
  gates: "Entry/Exit Gates",
  wheelchair_buggy: "Wheelchair, Buggy & Cloak Room Points",
} as const satisfies Record<CategoryKey, string>;

// ---------------------------------------------------------------------------
// Facility types
// ---------------------------------------------------------------------------

/**
 * A finer label *within* a category, only meaningful for categories that
 * bundle more than one distinct kind of place (e.g. Water & Restrooms
 * covers both taps and toilets). Small fixed vocabulary, hand-translated
 * per language rather than per record.
 */
export const FACILITY_TYPE_LABELS = {
  dormitory: { en: "Dormitory", te: "వసతి గృహం", hi: "छात्रावास" },
  room: { en: "Room", te: "గది", hi: "कमरा" },
  guest_house: { en: "Guest House", te: "గెస్ట్ హౌస్", hi: "गेस्ट हाउस" },
  auditorium: { en: "Auditorium", te: "ఆడిటోరియం", hi: "सभागार" },
  temple: { en: "Temple", te: "దేవాలయం", hi: "मंदिर" },
  convention_hall: { en: "Convention Hall", te: "కన్వెన్షన్ హాల్", hi: "कन्वेंशन हॉल" },
  water: { en: "Water", te: "నీరు", hi: "पानी" },
  restroom: { en: "Restroom", te: "విశ్రాంతి గది", hi: "शौचालय" },
  canteen: { en: "Canteen", te: "క్యాంటీన్", hi: "कैंटीन" },
  refreshments_snacks: {
    en: "Refreshments & Snacks",
    te: "ఫలహారాలు & స్నాక్స్",
    hi: "जलपान एवं नाश्ता",
  },
  shopping: { en: "Shopping", te: "షాపింగ్", hi: "खरीदारी" },
  coffee_kiosk: { en: "Coffee Kiosk", te: "కాఫీ కియోస్క్", hi: "कॉफ़ी कियॉस्क" },
  library: { en: "Library", te: "లైబ్రరీ", hi: "पुस्तकालय" },
  books_photos: { en: "Books & Photos", te: "పుస్తకాలు & ఫోటోలు", hi: "किताबें और तस्वीरें" },
  pro: { en: "PRO", te: "PRO", hi: "प्रो" },
  central_trust: { en: "Central Trust", te: "సెంట్రల్ ట్రస్ట్", hi: "सेंट्रल ट्रस्ट" },
  sadhana_trust: { en: "Sadhana Trust", te: "సాధన ట్రస్ట్", hi: "साधना ट्रस्ट" },
  police_station: { en: "Police Station", te: "పోలీస్ స్టేషన్", hi: "पुलिस स्टेशन" },
  security_office: { en: "Security Office", te: "భద్రతా కార్యాలయం", hi: "सुरक्षा कार्यालय" },
  gate: { en: "Gate", te: "గేటు", hi: "गेट" },
  wheelchair: { en: "Wheelchair Point", te: "వీల్‌చైర్ పాయింట్", hi: "व्हीलचेयर पॉइंट" },
  buggy: { en: "Buggy Point", te: "బగ్గీ పాయింట్", hi: "बग्गी पॉइंट" },
  cloak_room: { en: "Cloak Room", te: "క్లోక్ రూమ్", hi: "क्लोक रूम" },
} as const satisfies Record<string, Localized>;

export type FacilityTypeKey = keyof typeof FACILITY_TYPE_LABELS;

/**
 * Which facility types are offered for each category. `satisfies` here is
 * what makes the sync guarantee real: add a category above without listing
 * it here and this fails to compile; list a facility type that has no
 * label and it fails too.
 */
export const CATEGORY_FACILITY_TYPES = {
  mandir: [],
  accommodation: ["dormitory", "room", "guest_house"],
  spiritual_places: ["auditorium", "temple", "convention_hall"],
  water_restrooms: ["water", "restroom"],
  canteens_shopping: ["canteen", "refreshments_snacks", "shopping", "coffee_kiosk"],
  library: ["library", "books_photos"],
  offices: ["pro", "central_trust", "sadhana_trust", "police_station", "security_office"],
  gates: ["gate"],
  wheelchair_buggy: ["wheelchair", "buggy", "cloak_room"],
} as const satisfies Record<CategoryKey, readonly FacilityTypeKey[]>;

/** Union of every category's facility types, for the admin dropdown. */
export const ALL_FACILITY_TYPES = [
  ...new Set(Object.values(CATEGORY_FACILITY_TYPES).flat()),
].sort() as FacilityTypeKey[];

export function facilityTypeLabel(key: string, lang: Lang): string {
  const entry = FACILITY_TYPE_LABELS[key as FacilityTypeKey];
  return entry ? entry[lang] || entry.en : key;
}

// ---------------------------------------------------------------------------
// Gender
// ---------------------------------------------------------------------------

export const GENDERS = ["ladies", "gents", "unisex"] as const;
export type Gender = (typeof GENDERS)[number];

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------

/**
 * Hardcoded pin order, scoped to the Accommodation category only — these
 * ids lead the list (in this order) when browsing that category, ahead of
 * every other accommodation place regardless of actual distance.
 *
 * Deliberately NOT applied in idle "Near you" (which mixes every category
 * by distance) — pinning an office above a gate that's literally next to
 * you read as wrong there, so that list stays pure distance order.
 */
export const PINNED_POI_ORDER: Partial<Record<CategoryKey, readonly string[]>> = {
  accommodation: ["accomganeshgate", "accommain"],
};

/** Event types accepted by the analytics endpoint. */
export const EVENT_TYPES = ["open", "poi_view", "directions", "category", "search"] as const;
export type EventType = (typeof EVENT_TYPES)[number];
