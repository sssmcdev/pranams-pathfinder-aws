"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ChangePasswordForm } from "./ChangePasswordForm";

const NAV = [
  { href: "/admin/pois", label: "Points of Interest", group: "Content" },
  { href: "/admin/sub-places", label: "Sub-places & Entrances", group: "Content" },
  { href: "/admin/media", label: "Photo Library", group: "Content" },
  { href: "/admin/feedback", label: "Feedback", group: "Reports" },
  { href: "/admin/flags", label: "Flagged Activity", group: "Reports" },
  { href: "/admin/admins", label: "Administrators", group: "Access" },
  { href: "/admin/password", label: "Change Password", group: "Access" },
];

interface SessionInfo {
  authenticated: boolean;
  email: string | null;
  role: "admin" | "analytics" | null;
  mustChangePassword: boolean;
}

/** Auth gate + chrome for every /admin page. Replaces sqladmin's
 *  AuthenticationBackend and its Tabler layout template. */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [state, setState] = useState<"checking" | "login" | "denied" | "in">("checking");
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  /**
   * /admin is administrators-only. A valid session that is not role
   * "admin" — one of the analytics-only logins — must not see this panel
   * merely because `authenticated` is true, so it gets "denied" and a
   * pointer to the dashboard instead.
   *
   * A flagged administrator stays "in" and is shown the password form
   * below rather than being denied: they do have access, they just have
   * to finish setting it up.
   */
  const loadSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session");
      const info: SessionInfo = await res.json();
      setSession(info);
      if (!info.authenticated) setState("login");
      else if (info.role !== "admin") setState("denied");
      else setState("in");
    } catch {
      setSession(null);
      setState("login");
    }
  }, []);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  if (state === "checking") {
    return (
      <div className="admin-login">
        <p className="muted">Checking session…</p>
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div className="admin-login">
        <h1>Prasanthi Path&nbsp;Finder Admin</h1>
        <p className="muted">
          This account doesn&apos;t have access to the admin panel. It can open the{" "}
          <Link href="/analytics">analytics dashboard</Link>.
        </p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            setSession(null);
            setState("login");
          }}
        >
          Sign out
        </button>
      </div>
    );
  }

  if (state === "login") {
    return (
      <div className="admin-login">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            const res = await fetch("/api/auth/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ username, password }),
            });
            // Re-read the session rather than trusting the login response:
            // it is the one place the role and mustChangePassword are
            // derived from the row, so neither the denied screen nor the
            // forced-change screen can be skipped by a stale client.
            if (res.ok) await loadSession();
            else setError("Invalid credentials.");
          }}
        >
          <h1>Prasanthi Path&nbsp;Finder Admin</h1>
          <input
            type="text"
            placeholder="Email"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <div className="form-error">{error}</div>}
          <button type="submit" className="btn btn-primary">
            Sign in
          </button>
        </form>
      </div>
    );
  }

  /**
   * A flagged account gets this screen and nothing else — no sidebar, no
   * children — until it clears. The server enforces the same thing for the
   * data: every admin API call still goes through requireAdmin, so this
   * screen is the usability half of the rule, not the security half.
   */
  if (session?.mustChangePassword && session.email) {
    return (
      <div className="admin">
        <main className="admin-main">
          <div className="admin-head">
            <div>
              <h1>Set your password</h1>
              <p className="muted">One step before you can use the admin panel.</p>
            </div>
          </div>
          <div className="card">
            <ChangePasswordForm email={session.email} forced onDone={loadSession} />
          </div>
        </main>
      </div>
    );
  }

  // The env break-glass account has no stored password, so the page that
  // changes one would only ever tell it so. Hide the link instead.
  const nav = session?.email ? NAV : NAV.filter((n) => n.href !== "/admin/password");
  const groups = [...new Set(nav.map((n) => n.group))];

  return (
    <div className="admin">
      <aside className="admin-sidebar">
        <h2 className="admin-brand">
          Prasanthi Path&nbsp;Finder
          <small>Admin</small>
        </h2>
        {groups.map((group) => (
          <div key={group}>
            <div className="admin-nav-sep">{group}</div>
            {nav.filter((n) => n.group === group).map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={`admin-nav-link${pathname.startsWith(n.href) ? " active" : ""}`}
              >
                {n.label}
              </Link>
            ))}
          </div>
        ))}
        <div className="admin-nav-sep">Elsewhere</div>
        <Link href="/analytics" className="admin-nav-link">
          Analytics
        </Link>
        <Link href="/" className="admin-nav-link">
          Visitor app
        </Link>
        <button
          type="button"
          className="admin-nav-link"
          style={{ textAlign: "left", cursor: "pointer", background: "none" }}
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            setSession(null);
            setState("login");
            router.refresh();
          }}
        >
          Sign out
        </button>
        <p className="admin-whoami">
          {session?.email ?? "Environment admin account"}
        </p>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}
