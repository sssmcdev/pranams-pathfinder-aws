"use client";

import { useEffect, useRef } from "react";
import type * as LeafletNS from "leaflet";

import { categoryLabel } from "@/lib/domain";
import { haversineM, walkMinutes, type LatLon } from "@/lib/geo";
import type { ApiPoi } from "@/lib/types";
import { useLang } from "@/components/LangProvider";
import { BackIcon } from "@/components/icons";

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function DirectionsView({
  target,
  userPos,
  onBack,
}: {
  target: ApiPoi;
  userPos: LatLon;
  onBack: () => void;
}) {
  const { lang, t } = useLang();
  const mapNode = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletNS.Map | null>(null);

  useEffect(() => {
    let cancelled = false;
    let map: LeafletNS.Map | null = null;

    // Leaflet touches `window` at import time, so it can only be loaded
    // in the browser. A dynamic import here keeps this component itself
    // server-renderable, which a next/dynamic ssr:false wrapper would not.
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapNode.current) return;

      map = L.map(mapNode.current, { zoomControl: false }).setView([userPos.lat, userPos.lon], 17);
      mapRef.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);
      L.control.zoom({ position: "bottomright" }).addTo(map);

      const blue = cssVar("--blue");
      L.circleMarker([userPos.lat, userPos.lon], {
        radius: 8,
        color: blue,
        fillColor: blue,
        fillOpacity: 1,
        weight: 3,
      }).addTo(map);

      const destIcon = L.divIcon({
        className: "",
        html: `<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;background:var(--pink);transform:rotate(-45deg);box-shadow:0 3px 8px rgba(0,0,0,0.3)"></div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 26],
      });
      L.marker([target.lat, target.lon], { icon: destIcon }).addTo(map);

      const route = L.polyline(
        [
          [userPos.lat, userPos.lon],
          [target.lat, target.lon],
        ],
        { color: blue, dashArray: "6 8", weight: 3 },
      ).addTo(map);

      map.fitBounds(route.getBounds(), { padding: [40, 40] });
      // The container is sized by CSS after mount; without this the tiles
      // lay out against a zero-height box.
      requestAnimationFrame(() => map?.invalidateSize());
    })();

    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
    };
  }, [target.id, target.lat, target.lon, userPos.lat, userPos.lon]);

  const distanceM = haversineM(userPos, target);

  return (
    <div className="directions-view open">
      <div className="directions-header">
        <button type="button" className="back-btn" aria-label="Back" onClick={onBack}>
          <BackIcon />
        </button>
        <div className="directions-title">
          <span className="badge">{target.category ? categoryLabel(target.category, lang) : ""}</span>
          <h2>{target.name}</h2>
        </div>
        <span className="dt">
          {Math.round(distanceM)} m · {walkMinutes(distanceM)} min
        </span>
      </div>

      <div id="directions-map" ref={mapNode} />

      <a
        className="cta directions-external"
        target="_blank"
        rel="noopener"
        href={`https://www.google.com/maps/dir/?api=1&destination=${target.lat},${target.lon}&travelmode=walking&dir_action=navigate`}
      >
        {t("open_in_maps")}
      </a>
    </div>
  );
}
