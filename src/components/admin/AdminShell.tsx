"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const NAV = [
  { href: "/admin/pois", label: "Points of Interest", group: "Content" },
  { href: "/admin/sub-places", label: "Sub-places & Entrances", group: "Content" },
  { href: "/admin/media", label: "Photo Library", group: "Content" },
  { href: "/admin/feedback", label: "Feedback", group: "Reports" },
  { href: "/admin/flags", label: "Flagged Activity", group: "Reports" },
];

/** Auth gate + chrome for every /admin page. Replaces sqladmin's
 *  AuthenticationBackend and its Tabler layout template. */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [state, setState] = useState<"checking" | "login" | "in">("checking");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/session");
        const { authenticated } = await res.json();
        setState(authenticated ? "in" : "login");
      } catch {
        setState("login");
      }
    })();
  }, []);

  if (state === "checking") {
    return (
      <div className="admin-login">
        <p className="muted">Checking session…</p>
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
            if (res.ok) setState("in");
            else setError("Invalid credentials.");
          }}
        >
          <h1>PRANAMS Admin</h1>
          <input
            type="text"
            placeholder="Username"
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

  const groups = [...new Set(NAV.map((n) => n.group))];

  return (
    <div className="admin">
      <aside className="admin-sidebar">
        <h2 className="admin-brand">
          PRANAMS
          <small>Admin</small>
        </h2>
        {groups.map((group) => (
          <div key={group}>
            <div className="admin-nav-sep">{group}</div>
            {NAV.filter((n) => n.group === group).map((n) => (
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
            setState("login");
            router.refresh();
          }}
        >
          Sign out
        </button>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}
