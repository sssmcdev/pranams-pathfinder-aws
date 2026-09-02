/**
 * Extract lat/lon from a pasted Google Maps link (or raw coordinates).
 * Ported from backend/app/maps_link.py.
 *
 * Covers the shapes a "Share" action produces:
 *   https://www.google.com/maps/@14.1666,77.8033,17z
 *   https://www.google.com/maps/place/X/@14.1666,77.8033,17z/data=!3d14.1666!4d77.8033
 *   https://maps.google.com/?q=14.1666,77.8033
 *   ...&ll=14.1666,77.8033&...
 *   "14.1666, 77.8033" pasted directly
 *
 * Shortened links don't contain coordinates — they redirect to a URL that
 * does. Those are resolved with a single outbound request, restricted to a
 * small allowlist of Google hosts so this cannot be used as an open fetch
 * proxy against arbitrary internal addresses.
 */

const RESOLVABLE_HOSTS = new Set(["maps.app.goo.gl", "goo.gl", "g.co"]);

// Tried in priority order — !3d/!4d pins the actual marker; @lat,lon is the
// map's centre, usually but not always the same point.
const PATTERNS = [
  /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
  /@(-?\d+\.\d+),(-?\d+\.\d+)/,
  /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/,
  /[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/,
];

const RAW_COORDS = /^\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*$/;

export interface LatLonPair {
  lat: number;
  lon: number;
}

function tryPatterns(text: string): LatLonPair | null {
  for (const pattern of PATTERNS) {
    const m = pattern.exec(text);
    if (m) return { lat: Number(m[1]), lon: Number(m[2]) };
  }
  return null;
}

export async function extractLatLon(input: string): Promise<LatLonPair | null> {
  const text = input.trim();
  if (!text) return null;

  const raw = RAW_COORDS.exec(text);
  if (raw) return { lat: Number(raw[1]), lon: Number(raw[2]) };

  const found = tryPatterns(text);
  if (found) return found;

  let host: string;
  try {
    host = new URL(text).host;
  } catch {
    return null;
  }
  if (!RESOLVABLE_HOSTS.has(host)) return null;

  try {
    const res = await fetch(text, {
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; PrasanthiWayfinder/1.0)" },
      signal: AbortSignal.timeout(5000),
    });
    // The resolved URL is what carries the coordinates; the body is not read.
    return tryPatterns(res.url);
  } catch {
    return null;
  }
}
