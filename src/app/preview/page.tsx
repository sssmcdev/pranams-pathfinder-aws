"use client";

import { LanguagePicker } from "@/components/LanguagePicker";
import { useLang } from "@/components/LangProvider";
import { PreviewGate } from "@/components/PreviewGate";

/**
 * /preview goes through the language picker too — it exists to mock the
 * full visitor experience for testing away from the ashram, so it should
 * show everything a real first-time visitor would see.
 */
export default function PreviewPage() {
  const { ready, storedLang, setLang } = useLang();
  if (!ready) return null;
  if (!storedLang) return <LanguagePicker onPick={setLang} />;
  return <PreviewGate />;
}
