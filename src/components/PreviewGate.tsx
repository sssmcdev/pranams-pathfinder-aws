"use client";

import { useEffect, useState } from "react";

import { useLang } from "@/components/LangProvider";
import { VisitorApp } from "@/components/VisitorApp";

/**
 * /preview is a second entry point, off the home URL, for testing away
 * from the ashram: sign in with the admin credentials instead of proving
 * location. It shares one session with /admin and /analytics.
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

  // Admin only — an analytics-only login must not land here, since preview
  // bypasses the location check /analytics has no reason to grant.
  const checkSession = async () => {
    try {
      const res = await fetch("/api/auth/session");
      const { authenticated, role, must_change_password } = await res.json();
      if (!authenticated) setState("login");
      else if (role === "admin" && !must_change_password) setState("in");
      else setState("denied");
    } catch {
      setState("login");
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  if (state === "in") return <VisitorApp openCoords={null} analyticsEnabled={false} />;

  return (
    <div className="geofence-overlay" style={{ display: "flex" }}>
      {state === "checking" ? (
        <p className="geofence-text">{t("geofence_checking_session")}</p>
      ) : state === "denied" ? (
        <div className="preview-login" style={{ display: "flex" }}>
          <p className="geofence-text">This account doesn&apos;t have access to preview.</p>
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
              placeholder="Username"
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
