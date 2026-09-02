"use client";

import { LANGS, type Lang } from "@/lib/domain";
import { LANG_NATIVE_NAMES } from "@/lib/i18n";

const TILE_COLORS: Record<Lang, string> = {
  en: "lang-tile-pink",
  te: "lang-tile-blue",
  hi: "lang-tile-yellow",
};

/**
 * First-ever visit (nothing saved under pranams_lang) asks the visitor to
 * pick a language before anything else — including the geofence check —
 * so "Checking your location…" comes back in their language rather than a
 * silent English default.
 */
export function LanguagePicker({ onPick }: { onPick: (lang: Lang) => void }) {
  return (
    <div className="lang-select-overlay" style={{ display: "flex" }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- the old
          markup hides a missing logo via onError; next/image would render
          its own placeholder chrome instead. */}
      <img
        className="lang-select-logo"
        src="/assets/sssct-logo.png"
        alt="Sri Sathya Sai Central Trust logo"
        onError={(e) => e.currentTarget.remove()}
      />
      <h1 className="lang-select-title">PRANAMS</h1>
      <p className="lang-select-sub">
        Select your language &middot; మీ భాషను ఎంచుకోండి &middot; अपनी भाषा चुनें
      </p>
      <div className="lang-select-grid">
        {LANGS.map((lang) => (
          <button
            key={lang}
            type="button"
            className={`lang-tile ${TILE_COLORS[lang]}`}
            onClick={() => onPick(lang)}
          >
            {LANG_NATIVE_NAMES[lang]}
          </button>
        ))}
      </div>
    </div>
  );
}
