"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { categoryLabel, facilityTypeLabel, type CategoryKey } from "@/lib/domain";
import { isOnSite, SHANTHI_BHAVAN_POS, type LatLon } from "@/lib/geo";
import { CATEGORY_FACILITY_TYPES } from "@/lib/domain";
import { facilityTypesInView, filterPois, subPlaceAsSheetTarget } from "@/lib/poi-filter";
import { logEvent } from "@/lib/analytics-client";
import type { ApiPoi, PoiListRow } from "@/lib/types";
import { useLang } from "@/components/LangProvider";
import { BrandHeader } from "@/components/BrandHeader";
import { CategoryGrid } from "@/components/CategoryGrid";
import { DirectionsView } from "@/components/DirectionsView";
import { FacilityFilters } from "@/components/FacilityFilters";
import { FeedbackSheet } from "@/components/FeedbackSheet";
import { PoiList } from "@/components/PoiList";
import { PoiSheet } from "@/components/PoiSheet";
import { CloseIcon, SearchIcon } from "@/components/icons";

/** One entry per level of sheet the visitor has drilled through, so Close
 *  returns to the entrance picker it came from rather than dismissing. */
type SheetStack = ApiPoi[];

export function VisitorApp({
  openCoords,
  analyticsEnabled,
}: {
  openCoords: LatLon | null;
  analyticsEnabled: boolean;
}) {
  const { lang, t } = useLang();

  const [pois, setPois] = useState<ApiPoi[]>([]);
  const [userPos, setUserPos] = useState<LatLon>(SHANTHI_BHAVAN_POS);
  const [activeCategory, setActiveCategory] = useState<CategoryKey | null>(null);
  const [activeFacilityType, setActiveFacilityType] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [catsExpanded, setCatsExpanded] = useState(false);
  const [sheetStack, setSheetStack] = useState<SheetStack>([]);
  const [directionsTarget, setDirectionsTarget] = useState<ApiPoi | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const loggedOpen = useRef(false);

  // One "open" event per app start, even though React may run effects
  // twice in development's strict mode.
  useEffect(() => {
    if (loggedOpen.current) return;
    loggedOpen.current = true;
    logEvent({ event_type: "open", lat: openCoords?.lat, lon: openCoords?.lon }, analyticsEnabled);
  }, [openCoords, analyticsEnabled]);

  // Reload whenever the language changes — the server returns localized
  // names/descriptions, so this is not a client-side relabel.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/pois?lang=${lang}`);
        const data: ApiPoi[] = await res.json();
        if (!cancelled) setPois(data);
      } catch {
        // Keep whatever list we already have rather than blanking the app.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lang]);

  // Refine the origin used for distances. Off-site or wildly inaccurate
  // readings fall back to Shanthi Bhavan rather than showing distances
  // from halfway across the world.
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const candidate: LatLon = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setUserPos(isOnSite(candidate) ? candidate : SHANTHI_BHAVAN_POS);
      },
      () => {},
      { timeout: 4000 },
    );
  }, []);

  // Debounced search, and one analytics event per settled query.
  useEffect(() => {
    const handle = setTimeout(() => {
      const q = searchInput.trim().toLowerCase();
      setSearchQuery(q);
      if (q) logEvent({ event_type: "search", search_query: q }, analyticsEnabled);
    }, 300);
    return () => clearTimeout(handle);
  }, [searchInput, analyticsEnabled]);

  const rows = useMemo(
    () => filterPois({ pois, userPos, activeCategory, activeFacilityType, searchQuery }),
    [pois, userPos, activeCategory, activeFacilityType, searchQuery],
  );

  const facilityTypes = useMemo(
    () => facilityTypesInView(pois, activeCategory),
    [pois, activeCategory],
  );

  const openSheet = useCallback(
    (poi: ApiPoi, stack: SheetStack) => {
      logEvent({ event_type: "poi_view", poi_id: poi.id, category: poi.category }, analyticsEnabled);
      setSheetStack(stack);
    },
    [analyticsEnabled],
  );

  const handlePickCategory = useCallback(
    (key: CategoryKey) => {
      if (activeCategory === key) return;
      logEvent({ event_type: "category", category: key }, analyticsEnabled);
      const matches = pois.filter((p) => p.category === key);
      // Only one place in the whole category (e.g. Mandir) — open it
      // directly rather than entering a pointless one-item filtered list,
      // so closing the sheet returns straight to the idle home.
      if (matches.length === 1) {
        openSheet(matches[0], [matches[0]]);
        return;
      }
      setActiveCategory(key);
      setActiveFacilityType(null);
    },
    [activeCategory, pois, analyticsEnabled, openSheet],
  );

  const closeSheet = useCallback(() => {
    // Drop one level: back to the entrance picker, not a full dismiss.
    setSheetStack((stack) => stack.slice(0, -1));
  }, []);

  const startDirections = useCallback(
    (target: ApiPoi) => {
      logEvent(
        { event_type: "directions", poi_id: target.id, category: target.category },
        analyticsEnabled,
      );
      // Leaving the sheet entirely, even from a drilled-into facility.
      setSheetStack([]);
      setDirectionsTarget(target);
    },
    [analyticsEnabled],
  );

  const idle = !activeCategory && !searchQuery;

  // "Search water, toilets, Mandir…" globally; narrows to the active
  // category's own facility types once one is picked.
  const searchPlaceholder = useMemo(() => {
    if (!activeCategory) return t("search_placeholder");
    const types = CATEGORY_FACILITY_TYPES[activeCategory];
    const examples = types.length
      ? types.slice(0, 3).map((ft) => facilityTypeLabel(ft, lang)).join(", ")
      : categoryLabel(activeCategory, lang);
    return `${t("search_prefix")} ${examples}…`;
  }, [activeCategory, lang, t]);

  const currentSheet = sheetStack.at(-1) ?? null;

  return (
    <div id="app">
      <BrandHeader onOpenFeedback={() => setFeedbackOpen(true)} />

      <div className="search-row">
        <div className="search">
          <SearchIcon />
          <input
            placeholder={searchPlaceholder}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          {searchInput && (
            <button
              type="button"
              className="search-clear"
              aria-label="Clear search"
              onClick={() => {
                setSearchInput("");
                setSearchQuery("");
                setActiveFacilityType(null);
              }}
            >
              <CloseIcon />
            </button>
          )}
        </div>
      </div>

      {/* The grid only makes sense while browsing: a search or a category
          tap is a deliberate, focused action, so it collapses out of the
          way and gives results the full remaining height. */}
      {idle && (
        <CategoryGrid
          activeCategory={activeCategory}
          expanded={catsExpanded}
          onToggleExpanded={() => setCatsExpanded((v) => !v)}
          onPick={handlePickCategory}
        />
      )}

      <div className={`sec-title${activeCategory && !searchQuery ? " clearable" : ""}`}>
        <span>{activeCategory ? categoryLabel(activeCategory, lang) : t("near_you")}</span>
        {/* Once the grid is hidden the tile's own deselect gesture is out
            of reach, so the title doubles as a clearable chip. */}
        {activeCategory && !searchQuery && (
          <button
            type="button"
            className="clear-x"
            onClick={() => {
              setActiveCategory(null);
              setActiveFacilityType(null);
            }}
          >
            {t("close")} ✕
          </button>
        )}
      </div>

      {activeCategory && (
        <FacilityFilters
          activeCategory={activeCategory}
          types={facilityTypes}
          activeFacilityType={activeFacilityType}
          onPick={setActiveFacilityType}
        />
      )}

      <PoiList
        rows={rows}
        onOpen={(row: PoiListRow) => {
          // A search result that matched a sub-place opens that facility
          // directly. No parent is pushed: the visitor never saw the
          // entrance picker, so Close should dismiss, not "go back".
          // subPlaceAsSheetTarget layers the sub-place's own name,
          // coordinates and photo over the parent's other details. A bare
          // spread of `row` would keep the PARENT's lat/lon and name, and
          // route the visitor to the building instead of the entrance.
          const target: ApiPoi = row.matched_sub_place
            ? subPlaceAsSheetTarget(row, row.matched_sub_place)
            : row;
          openSheet(target, [target]);
        }}
      />

      {currentSheet && (
        <PoiSheet
          poi={currentSheet}
          userPos={userPos}
          onClose={closeSheet}
          onDrillInto={(target) => openSheet(target, [...sheetStack, target])}
          onStartDirections={startDirections}
        />
      )}

      {feedbackOpen && <FeedbackSheet onClose={() => setFeedbackOpen(false)} />}

      {directionsTarget && (
        <DirectionsView
          target={directionsTarget}
          userPos={userPos}
          onBack={() => setDirectionsTarget(null)}
        />
      )}
    </div>
  );
}
