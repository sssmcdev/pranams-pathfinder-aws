"use client";

import { useEffect, useRef } from "react";
import type * as LeafletNS from "leaflet";

import { ASHRAM_CENTER } from "@/lib/geo";

const TILES = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = "&copy; OpenStreetMap contributors";

/** Heatmap of where the app is opened. */
export function UsageHeatmap({ points }: { points: { lat: number; lon: number }[] }) {
  const node = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let map: LeafletNS.Map | null = null;

    (async () => {
      const L = (await import("leaflet")).default;
      // leaflet.heat augments the Leaflet namespace as a side effect and
      // must be imported after it.
      await import("leaflet.heat");
      if (cancelled || !node.current) return;

      map = L.map(node.current).setView([ASHRAM_CENTER.lat, ASHRAM_CENTER.lon], 16);
      L.tileLayer(TILES, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(map);
      if (points.length) {
        L.heatLayer(
          points.map((p) => [p.lat, p.lon, 1] as [number, number, number]),
          { radius: 25, blur: 18, maxZoom: 18 },
        ).addTo(map);
        const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lon] as [number, number]));
        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 17 });
      }
      requestAnimationFrame(() => map?.invalidateSize());
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [points]);

  return <div id="usage-map" ref={node} />;
}

export interface ActiveDevice {
  device_id: string;
  lat: number;
  lon: number;
  last_seen: string;
  search_count: number;
}

function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  return seconds < 60 ? `${seconds}s ago` : `${Math.round(seconds / 60)} min ago`;
}

/** One marker per device seen in the last hour, with a popup. */
export function DevicesMap({ devices }: { devices: ActiveDevice[] }) {
  const node = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let map: LeafletNS.Map | null = null;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !node.current) return;

      map = L.map(node.current, { zoomControl: true }).setView(
        [ASHRAM_CENTER.lat, ASHRAM_CENTER.lon],
        16,
      );
      L.tileLayer(TILES, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(map);

      for (const d of devices) {
        L.circleMarker([d.lat, d.lon], {
          radius: 9,
          color: "#3987e5",
          fillColor: "#3987e5",
          fillOpacity: 0.85,
          weight: 2,
        })
          .addTo(map)
          .bindPopup(
            `<b>Device ${d.device_id.slice(0, 8)}…</b><br>Last seen: ${timeAgo(d.last_seen)}` +
              `<br>Searches (last hour): ${d.search_count}`,
          );
      }
      requestAnimationFrame(() => map?.invalidateSize());
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [devices]);

  return <div id="devices-map" ref={node} />;
}
