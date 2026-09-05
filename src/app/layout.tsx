import type { Metadata, Viewport } from "next";

// The visitor app's stylesheet, carried over verbatim from
// frontend/styles.css so the port is visually identical. It is
// self-contained: system font stacks, no @import, no url() assets.
import "./globals.css";
// Was loaded from unpkg in the old index.html; bundling it removes a
// third-party runtime dependency and works offline.
import "leaflet/dist/leaflet.css";

import { LangProvider } from "@/components/LangProvider";

export const metadata: Metadata = {
  title: "PRANAMS Pathfinder",
  description: "Prasanthi Nilayam Ashram Management System",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // The frame is positioned with env(safe-area-inset-*), which only
  // reports non-zero once the page is allowed to extend under the notch
  // and the home indicator. Without this it stays letterboxed and every
  // inset reads 0.
  viewportFit: "cover",
  themeColor: "#ffffff",
  // Deliberately no maximumScale / userScalable: pinch-zoom stays
  // available. Inputs are sized >=16px instead, which is what actually
  // stops iOS from auto-zooming on focus.
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  );
}
