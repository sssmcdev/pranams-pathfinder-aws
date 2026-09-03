"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { LANGS, type Lang } from "@/lib/domain";
import { LANG_STORAGE_KEY, t as translate, type UIStringKey } from "@/lib/i18n";

interface LangContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** True once localStorage has been read — see the SSR note below. */
  ready: boolean;
  /** Null until read; null means "this visitor has never chosen". */
  storedLang: Lang | null;
  t: (key: UIStringKey) => string;
}

const LangContext = createContext<LangContextValue | null>(null);

function readStoredLang(): Lang | null {
  try {
    const raw = localStorage.getItem(LANG_STORAGE_KEY);
    return LANGS.includes(raw as Lang) ? (raw as Lang) : null;
  } catch {
    // Private mode / storage disabled — treat as "never chosen".
    return null;
  }
}

export function LangProvider({ children }: { children: React.ReactNode }) {
  // Always start at "en" so the server-rendered HTML and the first client
  // render agree. localStorage is read in the effect below, which is the
  // only place it exists. Rendering the stored language directly here
  // would hydrate-mismatch on every non-English visitor.
  const [lang, setLangState] = useState<Lang>("en");
  const [storedLang, setStoredLang] = useState<Lang | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readStoredLang();
    if (stored) {
      setStoredLang(stored);
      setLangState(stored);
    }
    setReady(true);
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    setStoredLang(next);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      // Non-fatal: the choice just won't survive a reload.
    }
  }, []);

  const value = useMemo<LangContextValue>(
    () => ({
      lang,
      setLang,
      ready,
      storedLang,
      t: (key: UIStringKey) => translate(key, lang),
    }),
    [lang, setLang, ready, storedLang],
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used inside <LangProvider>");
  return ctx;
}
