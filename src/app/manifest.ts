import type { MetadataRoute } from "next";

import { APP_DESCRIPTION, APP_NAME, APP_SHORT_NAME } from "@/lib/brand";

/**
 * Makes the visitor app installable to a phone's home screen, which is how
 * most of Prasanthi Nilayam will reach it — a QR code on a signboard, then
 * "Add to Home Screen" rather than a return trip through the browser.
 *
 * Colours match what the app actually paints first: the language picker
 * overlay and the body behind it are both --paper-raised, so the splash
 * screen hands over to the app without a flash of a different ground.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: APP_NAME,
    // Home screens allot roughly 12 characters before they truncate, and
    // "Prasanthi Path Finder" is 21 — this keeps the half that identifies it.
    short_name: APP_SHORT_NAME,
    description: APP_DESCRIPTION,
    lang: "en",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Launchers crop a maskable icon to their own shape, so this one keeps
      // the emblem inside the 60% safe zone with paper filling the corners.
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
