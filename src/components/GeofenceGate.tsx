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

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: LatLon = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        if (isWithinGeofence(coords)) setState({ status: "allowed", coords });
        else setState({ status: "blocked", message: t("geofence_not_onsite") });
      },
      () => setState({ status: "blocked", message: t("geofence_no_location") }),
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
