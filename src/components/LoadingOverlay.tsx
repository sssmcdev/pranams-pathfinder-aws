import { UI_STRINGS } from "@/lib/i18n";

/**
 * The first paint, before any client JavaScript has run.
 *
 * This must be rendered on the server rather than returning null while
 * waiting for localStorage. The old index.html carried this overlay as
 * static markup, so the visitor always saw "Checking your location…"
 * immediately; returning null gave an empty <body> instead, which is a
 * blank white page for as long as the client bundle takes to arrive —
 * and a permanently blank page if it never does.
 *
 * English on purpose: the stored language is not readable until after
 * mount, and English is what the static markup used before the old app's
 * JS localised it in place.
 */
export function LoadingOverlay({ message }: { message?: string }) {
  return (
    <div className="geofence-overlay">
      <p className="geofence-text">{message ?? UI_STRINGS.geofence_checking.en}</p>
    </div>
  );
}
