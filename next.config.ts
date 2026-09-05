import type { NextConfig } from "next";

/**
 * Hosts allowed to load dev-server resources (/_next/hmr and friends).
 * Only affects `next dev` — production is unaffected.
 *
 * Needed to open the dev server from another device on the LAN, which is
 * how this app actually gets tested: the geofence and the geolocation
 * permission both need a real phone, not a desktop browser.
 *
 * Set DEV_ORIGINS to a comma-separated list to add hosts outside the LAN
 * (a tunnel, a VPN address), e.g.
 *   DEV_ORIGINS=curly-fish-42.ngrok-free.app npm run dev
 */
const devOrigins = (process.env.DEV_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

/**
 * Every RFC 1918 private range as a wildcard, so the laptop's address can
 * move — new router, new coffee shop, new DHCP lease — without this file
 * needing an edit.
 *
 * Next matches these patterns one dot-separated segment at a time, and an
 * IPv4 address splits on "." exactly as a hostname does, so "192.168.*.*"
 * matches 192.168.127.221.
 *
 * The trade-off: any device on the same network can load dev-server
 * resources. That is true only while `next dev` is running, and these
 * ranges are unroutable from the internet by definition.
 */
const privateNetworks = [
  "10.*.*.*", // 10.0.0.0/8
  "192.168.*.*", // 192.168.0.0/16
  // 172.16.0.0/12, i.e. 172.16.x.x through 172.31.x.x. Spelled out because
  // a "*" only ever stands for one segment, so "172.*.*.*" would hand out
  // the public half of 172-space as well.
  ...Array.from({ length: 16 }, (_, i) => `172.${16 + i}.*.*`),
];

const nextConfig: NextConfig = {
  // localhost and *.localhost are allowed by Next itself; these cover the
  // phone. "**.local" is the mDNS name a Mac or an iPhone answers to
  // (bsks-iphone.local), which survives an IP change entirely.
  allowedDevOrigins: [...privateNetworks, "**.local", ...devOrigins],

  // Legacy Python app still lives in backend/ and frontend/ during the
  // port. Nothing in them is imported here; both are excluded in tsconfig.
};

export default nextConfig;
