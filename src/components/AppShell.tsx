"use client";

import { GeofenceGate } from "@/components/GeofenceGate";
import { LanguagePicker } from "@/components/LanguagePicker";
import { useLang } from "@/components/LangProvider";
import { VisitorApp } from "@/components/VisitorApp";

/**
 * The entry sequence, mirroring initApp() in frontend/app.js:
 *
 *   1. First-ever visit -> pick a language. This comes BEFORE the geofence
 *      check on purpose, so "Checking your location…" appears in the
 *      visitor's own language rather than a silent English default.
 *   2. Geofence check (or, on /preview, an admin sign-in).
 *   3. The app itself.
 *
 * Nothing below a step exists until that step passes — the overlays are
 * not painted over a live app.
 */
export function AppShell({ analyticsEnabled = true }: { analyticsEnabled?: boolean }) {
  const { ready, storedLang, setLang } = useLang();

  // localStorage is only readable after mount. Render nothing for that one
  // frame rather than flashing the language picker at a returning visitor.
  if (!ready) return null;

  if (!storedLang) return <LanguagePicker onPick={setLang} />;

  return (
    <GeofenceGate>
      {(openCoords) => <VisitorApp openCoords={openCoords} analyticsEnabled={analyticsEnabled} />}
    </GeofenceGate>
  );
}
