"use client";

import { useState } from "react";

import { useLang } from "@/components/LangProvider";

const RATING_KEYS = ["navigation", "info_accuracy", "overall"] as const;
type RatingKey = (typeof RATING_KEYS)[number];

const LABEL_KEY = {
  navigation: "feedback_navigation",
  info_accuracy: "feedback_info_accuracy",
  overall: "feedback_overall",
} as const;

export function FeedbackSheet({ onClose }: { onClose: () => void }) {
  const { t } = useLang();
  const [ratings, setRatings] = useState<Record<RatingKey, number>>({
    navigation: 0,
    info_accuracy: 0,
    overall: 0,
  });
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<{ text: string; ok: boolean } | null>(null);
  const [sending, setSending] = useState(false);

  async function submit() {
    if (RATING_KEYS.some((k) => ratings[k] === 0)) {
      setStatus({ text: t("feedback_rate_all"), ok: false });
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating_navigation: ratings.navigation,
          rating_info_accuracy: ratings.info_accuracy,
          rating_overall: ratings.overall,
          comment: comment.trim() || null,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus({ text: t("feedback_thanks"), ok: true });
      setRatings({ navigation: 0, info_accuracy: 0, overall: 0 });
      setComment("");
    } catch {
      setStatus({ text: t("feedback_error"), ok: false });
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="sheet-backdrop open"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sheet">
        <div className="drag-handle" />
        <div className="sheet-head">
          <h2>{t("feedback_title")}</h2>
        </div>

        {RATING_KEYS.map((key) => (
          <div className="feedback-rating" key={key}>
            <span className="feedback-label">{t(LABEL_KEY[key])}</span>
            <div className="star-row">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`star${value <= ratings[key] ? " filled" : ""}`}
                  aria-label={`${value} star${value === 1 ? "" : "s"}`}
                  onClick={() => setRatings((r) => ({ ...r, [key]: value }))}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
        ))}

        <textarea
          className="feedback-comment"
          rows={3}
          placeholder={t("feedback_comment_placeholder")}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />

        {status && (
          <p className={`feedback-status ${status.ok ? "success" : "error"}`}>{status.text}</p>
        )}

        <button type="button" className="cta" disabled={sending} onClick={submit}>
          {t("send_feedback")}
        </button>
        <button type="button" className="ghost-btn" onClick={onClose}>
          {t("close")}
        </button>
      </div>
    </div>
  );
}
