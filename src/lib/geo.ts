/**
 * Distance and the geofence constants. Ported from backend/app/geo.py and
 * the constants at the top of frontend/app.js — which had their own copy
 * of haversine, so this replaces both.
 */

const EARTH_RADIUS_M = 6_371_000;

const toRad = (deg: number) => (deg * Math.PI) / 180;

export interface LatLon {
  lat: number;
  lon: number;
}

export function haversineM(a: LatLon, b: LatLon): number {
  const dPhi = toRad(b.lat - a.lat);
  const dLambda = toRad(b.lon - a.lon);
  const h =
    Math.sin(dPhi / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLambda / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** Walking time at 70 m/min, floored at 1 so nothing reads as "0 min". */
export function walkMinutes(distanceM: number, speedMPerMin = 70): number {
  return Math.max(1, Math.round(distanceM / speedMPerMin));
}

/**
 * Hard access gate. The app is unusable beyond this radius — not merely
 * defaulted to a fallback position. Centre is the Prasanthi Nilayam pin.
 */
export const ASHRAM_CENTER: LatLon = { lat: 14.1662805, lon: 77.8078665 };
export const GEOFENCE_RADIUS_M = 3000;

/**
 * A separate, softer check used only to sanity-check the coordinates we
 * measure "Near you" distances from. Off-site or wildly inaccurate
 * readings fall back to Shanthi Bhavan rather than showing distances from
 * halfway across the world.
 */
export const PRASANTHI_NILAYAM_CENTER: LatLon = { lat: 14.1666, lon: 77.8033 };
export const ON_SITE_RADIUS_M = 5000;

/** Shanthi Bhavan VIP Guest House — the fallback origin. */
export const SHANTHI_BHAVAN_POS: LatLon = { lat: 14.1664542, lon: 77.8089405 };

export function isWithinGeofence(pos: LatLon): boolean {
  return haversineM(ASHRAM_CENTER, pos) <= GEOFENCE_RADIUS_M;
}

export function isOnSite(pos: LatLon): boolean {
  return haversineM(PRASANTHI_NILAYAM_CENTER, pos) <= ON_SITE_RADIUS_M;
}
