"use client";

import { useCallback, useEffect, useState } from "react";

import { useLang } from "@/components/LangProvider";
import { VisitorApp } from "@/components/VisitorApp";

/**
 * /preview is a second entry point, off the home URL, for testing away
 * from the ashram: sign in with any admin account instead of proving
 * location. It shares one session with /admin and /analytics.
 *
 * Unlike those two it does not hold an account still flagged
 * mustChangePassword out: the visitor app below is read-only and shows
 * nothing the person cannot already see by standing at the ashram, so
 * making them set a password first would only obstruct the testing this
 * route exists for.
 *
 * Analytics logging is disabled for everything below this gate — preview
 * traffic is admin and testing activity, not real visitors, and must
 * never pollute the dashboard.
 */
export function PreviewGate() {
  const { t } = useLang();
  const [state, setState] = useState<"checking" | "login" | "denied" | "in">("checking");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  /**
   * Administrators only — an analytics-only login must not land here,
   * since preview bypasses the location check that /analytics has no
   * reason to grant. A flagged administrator is held out too: there is no
   * password form on this route, so they are sent to set one first rather
   * than given a second place to do it.
   */
  const [denyReason, setDenyReason] = useState<"role" | "password">("role");

  const checkSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session");
      const { authenticated, role, mustChangePassword } = await res.json();
      if (!authenticated) {
        setState("login");
      } else if (role !== "admin") {
        setDenyReason("role");
        setState("denied");
      } else if (mustChangePassword) {
        setDenyReason("password");
        setState("denied");
      } else {
        setState("in");
      }
    } catch {
      setState("login");
    }
  }, []);

  useEffect(() => {
    void checkSession();
  }, [checkSession]);

  if (state === "in") return <VisitorApp openCoords={null} analyticsEnabled={false} />;

  return (
    <div className="geofence-overlay" style={{ display: "flex" }}>
      {state === "checking" ? (
        <p className="geofence-text">{t("geofence_checking_session")}</p>
      ) : state === "denied" ? (
        <div className="preview-login" style={{ display: "flex" }}>
          <p className="geofence-text">
            {denyReason === "password"
              ? "Set your own password at /admin/password before using preview."
              : "This account doesn't have access to preview."}
          </p>
          <button
            type="button"
            className="cta"
            style={{ width: "auto", padding: "12px 28px" }}
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              setState("login");
            }}
          >
            Sign out
          </button>
        </div>
      ) : (
        <form
          className="preview-login"
          style={{ display: "flex" }}
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            setSubmitting(true);
            try {
              const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
              });
              if (res.ok) await checkSession();
              else setError("Invalid credentials.");
            } catch {
              setError("Couldn't sign in. Please try again.");
            } finally {
              setSubmitting(false);
            }
          }}
        >
          <p className="geofence-text">
            Admin sign-in — testing only, bypasses the location check.
          </p>
          <div className="search">
            <input
              type="text"
              placeholder="Email"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="search">
            <input
              type="password"
              placeholder="Password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="geofence-text preview-login-error">{error}</p>}
          <button
            type="submit"
            className="cta"
            style={{ width: "auto", padding: "12px 28px" }}
            disabled={submitting}
          >
            Sign in
          </button>
        </form>
      )}
    </div>
  );
}
