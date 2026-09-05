"use client";

import { useEffect, useRef, useState } from "react";

import { LANGS, type Lang } from "@/lib/domain";
import { useLang } from "@/components/LangProvider";
import { MenuIcon } from "@/components/icons";

const LANG_CHIP_LABEL: Record<Lang, string> = { en: "EN", te: "తెలుగు", hi: "हिन्दी" };

export function BrandHeader({ onOpenFeedback }: { onOpenFeedback: () => void }) {
  const { lang, setLang, t } = useLang();
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const brandRef = useRef<HTMLDivElement>(null);

  // Click-outside closes the popover, matching the old document-level handler.
  useEffect(() => {
    if (!menuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (!brandRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [menuOpen]);

  return (
    <div className="brand" ref={brandRef}>
      {!logoFailed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="brand-logo"
          src="/assets/sssct-logo.png"
          alt="Sri Sathya Sai Central Trust logo"
          onError={() => setLogoFailed(true)}
        />
      )}
      {logoFailed && <div className="brand-fallback" style={{ display: "flex" }}>SSSCT</div>}

      <div className="brand-text">
        <span className="sub">Sri Sathya Sai Central Trust</span>
        <h1>PRANAMS Pathfinder</h1>
        <span className="full-form">Prasanthi Nilayam Ashram Management System</span>
      </div>

      <button
        type="button"
        className="menu-btn"
        aria-label="Menu"
        aria-expanded={menuOpen}
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen((v) => !v);
        }}
      >
        <MenuIcon />
      </button>

      {menuOpen && (
        <div className="menu-popover">
          <div className="lang-row">
            {LANGS.map((code) => (
              <button
                key={code}
                type="button"
                className={`lang-chip${code === lang ? " active" : ""}`}
                onClick={() => {
                  if (code !== lang) setLang(code);
                  setMenuOpen(false);
                }}
              >
                {LANG_CHIP_LABEL[code]}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="footer-link"
            onClick={() => {
              setMenuOpen(false);
              onOpenFeedback();
            }}
          >
            {t("give_feedback")}
          </button>
        </div>
      )}
    </div>
  );
}
