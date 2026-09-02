"use client";

import { GeofenceGate } from "@/components/GeofenceGate";
import { LoadingOverlay } from "@/components/LoadingOverlay";
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

  // localStorage is only readable after mount, so this frame cannot know
  // which language (or whether the visitor has chosen one). Show the
  // neutral "checking" overlay rather than the language picker, which
  // would flash at every returning visitor — and rather than null, which
  // renders an empty page until the client bundle arrives.
  if (!ready) return <LoadingOverlay />;

  if (!storedLang) return <LanguagePicker onPick={setLang} />;

  return (
    <GeofenceGate>
      {(openCoords) => <VisitorApp openCoords={openCoords} analyticsEnabled={analyticsEnabled} />}
    </GeofenceGate>
  );
}
