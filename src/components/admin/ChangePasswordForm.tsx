"use client";

import { useState } from "react";

import { MIN_PASSWORD_LENGTH } from "@/lib/password-policy";

/**
 * One form, two placements: the /admin/password page, and the blocking
 * screen AdminShell shows when an account is flagged mustChangePassword
 * (a new account, or one another admin has just reset).
 *
 * `forced` only changes the wording and what happens on success — the
 * endpoint and its rules are identical either way, including the current
 * password, which is required even under a forced change.
 */
export function ChangePasswordForm({
  email,
  forced = false,
  onDone,
}: {
  email: string;
  forced?: boolean;
  onDone?: () => void;
}) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Checked here as well as on the server because the confirmation
    // field is a UI affordance and is never sent — the server has no way
    // to notice a typo in it.
    if (next !== confirm) {
      setError("The two new passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.detail ?? "Could not change the password.");
        return;
      }
      setCurrent("");
      setNext("");
      setConfirm("");
      setDone(true);
      onDone?.();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ maxWidth: 420 }}>
      <div className="field full">
        <label>Signed in as</label>
        <p className="hint" style={{ margin: 0 }}>{email}</p>
      </div>

      {forced && (
        <p className="form-error" style={{ marginTop: 14 }}>
          Choose your own password before continuing. The one you signed in with was set by
          someone else, so it is not private to you.
        </p>
      )}

      <div className="field full" style={{ marginTop: 14 }}>
        <label>Current password</label>
        <input
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
        />
      </div>

      <div className="field full" style={{ marginTop: 14 }}>
        <label>New password</label>
        <input
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          required
          minLength={MIN_PASSWORD_LENGTH}
        />
        <span className="hint">
          At least {MIN_PASSWORD_LENGTH} characters. A short phrase you can remember beats a
          short scramble you cannot.
        </span>
      </div>

      <div className="field full" style={{ marginTop: 14 }}>
        <label>Confirm new password</label>
        <input
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
      </div>

      {error && <div className="form-error" style={{ marginTop: 14 }}>{error}</div>}
      {done && <div className="form-ok" style={{ marginTop: 14 }}>Password changed.</div>}

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Saving…" : "Change password"}
        </button>
      </div>
    </form>
  );
}
