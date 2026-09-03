import type { NextConfig } from "next";

/**
 * Hosts allowed to load dev-server resources (/_next/hmr and friends).
 * Only affects `next dev` — production is unaffected.
 *
 * Needed to open the dev server from another device on the LAN, which is
 * how this app actually gets tested: the geofence and the geolocation
 * permission both need a real phone, not a desktop browser.
 *
 * Set DEV_ORIGINS to a comma-separated list to add your own, e.g.
 *   DEV_ORIGINS=192.168.1.42,my-laptop.local npm run dev
 */
const devOrigins = (process.env.DEV_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.2.23", "*.local", ...devOrigins],

  // Legacy Python app still lives in backend/ and frontend/ during the
  // port. Nothing in them is imported here; both are excluded in tsconfig.
};

export default nextConfig;
