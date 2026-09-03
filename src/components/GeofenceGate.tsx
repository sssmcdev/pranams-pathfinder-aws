"use client";

import { useCallback, useEffect, useState } from "react";

import { useLang } from "@/components/LangProvider";
import { isWithinGeofence, type LatLon } from "@/lib/geo";

type GateState =
  | { status: "checking" }
  | { status: "blocked"; message: string }
  | { status: "allowed"; coords: LatLon | null };

/**
 * Hard access gate. This runs first and the rest of the app never mounts
 * unless it passes — the overlay is not merely painted over a live app,
 * the children genuinely do not exist until it resolves.
 *
 * Separate from the softer "is this reading plausible" check used for
 * Near-you distances (see isOnSite in lib/geo).
 */
export function GeofenceGate({
  children,
}: {
  children: (openCoords: LatLon | null) => React.ReactNode;
}) {
  const { t } = useLang();
  const [state, setState] = useState<GateState>({ status: "checking" });

  const check = useCallback(() => {
    setState({ status: "checking" });

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState({ status: "blocked", message: t("geofence_no_geo_support") });
      return;
    }

    // Geolocation is a secure-context API. https:// and http://localhost
    // qualify; http:// on a LAN address does not, and browsers reject the
    // call outright without ever showing a permission prompt — which also
    // means no entry appears in site settings to grant. Worth saying
    // plainly in the console, because "enable location access" is
    // unactionable advice when the browser never asked.
    if (typeof window !== "undefined" && !window.isSecureContext) {
      console.warn(
        `[geofence] ${window.location.origin} is not a secure context, so the browser ` +
          "will refuse geolocation and show no prompt. Use http://localhost, or run " +
          "`npm run dev -- --experimental-https` to reach this host over TLS.",
      );
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: LatLon = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        if (isWithinGeofence(coords)) setState({ status: "allowed", coords });
        else setState({ status: "blocked", message: t("geofence_not_onsite") });
      },
      (err) => {
        // The visitor-facing message stays the same three translated
        // strings; this is for whoever is debugging why it fired.
        const reason =
          err.code === err.PERMISSION_DENIED
            ? "PERMISSION_DENIED — the browser or the OS blocked it. On macOS check " +
              "System Settings > Privacy & Security > Location Services for this browser, " +
              "not just the site permission."
            : err.code === err.POSITION_UNAVAILABLE
              ? "POSITION_UNAVAILABLE — no fix available (location services off, or no signal)."
              : "TIMEOUT — no fix within 8s.";
        console.warn(`[geofence] ${reason}`, err);
        setState({ status: "blocked", message: t("geofence_no_location") });
      },
      { timeout: 8000, enableHighAccuracy: true },
    );
    // t is recreated when the language changes; the messages above must be
    // in the language the visitor picked, so that dependency is deliberate.
  }, [t]);

  useEffect(() => {
    check();
  }, [check]);

  if (state.status === "allowed") return <>{children(state.coords)}</>;

  return (
    <div className="geofence-overlay" style={{ display: "flex" }}>
      <p className="geofence-text">
        {state.status === "checking" ? t("geofence_checking") : state.message}
      </p>
      {state.status === "blocked" && (
        <button
          type="button"
          className="cta"
          style={{ width: "auto", padding: "12px 28px" }}
          onClick={check}
        >
          {t("geofence_retry")}
        </button>
      )}
    </div>
  );
}
