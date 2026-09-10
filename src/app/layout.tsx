import type { Metadata, Viewport } from "next";

// The visitor app's stylesheet, carried over verbatim from
// frontend/styles.css so the port is visually identical. It is
// self-contained: system font stacks, no @import, no url() assets.
import "./globals.css";
// Was loaded from unpkg in the old index.html; bundling it removes a
// third-party runtime dependency and works offline.
import "leaflet/dist/leaflet.css";

import { LangProvider } from "@/components/LangProvider";
import { APP_DESCRIPTION, APP_NAME, APP_SHORT_NAME } from "@/lib/brand";

// og: tags must carry absolute URLs — a crawler unfurling a shared link has no
// page to resolve /assets/og-image.png against. Vercel exposes the production
// domain at build time; NEXT_PUBLIC_SITE_URL overrides it once a custom domain
// is in front of it, and localhost keeps `next dev` from emitting a bare path.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: APP_NAME,
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  // Passing an object here also opts iOS into a chrome-less launch, matching
  // the manifest's display: "standalone" on Android — the visitor screens are
  // already a fixed frame laid out against env(safe-area-inset-*), so they
  // expect the full screen. Set capable: false and display: "browser" together
  // if a home-screen launch should keep the browser bar instead.
  appleWebApp: { title: APP_SHORT_NAME },
  openGraph: {
    type: "website",
    url: "/",
    siteName: APP_NAME,
    title: APP_NAME,
    description: APP_DESCRIPTION,
    locale: "en_IN",
    // Rendered from the emblem and the wordmark at the 1.91:1 the previewers
    // crop to, so nothing important sits near an edge.
    images: [
      {
        url: "/assets/og-image.png",
        width: 1200,
        height: 630,
        alt: `${APP_NAME} — Sri Sathya Sai Central Trust`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: APP_NAME,
    description: APP_DESCRIPTION,
    images: ["/assets/og-image.png"],
  },
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
