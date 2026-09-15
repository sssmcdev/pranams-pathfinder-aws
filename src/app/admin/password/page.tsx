"use client";

import { useEffect, useState } from "react";

import { ChangePasswordForm } from "@/components/admin/ChangePasswordForm";

/**
 * A client page rather than a server one because AdminShell already holds
 * the session on the client; fetching it again here keeps this page from
 * rendering a stale email after a sign-out and sign-in without a reload.
 */
export default function ChangePasswordPage() {
  const [email, setEmail] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/session");
        const { email } = await res.json();
        setEmail(email);
      } catch {
        setEmail(null);
      }
    })();
  }, []);

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>Change Password</h1>
          <p className="muted">Changes your own password. It takes effect immediately.</p>
        </div>
      </div>

      <div className="card">
        {email === undefined ? (
          <p className="admin-empty">Loading…</p>
        ) : email ? (
          <ChangePasswordForm email={email} />
        ) : (
          <p className="admin-empty">
            You are signed in with the environment admin account, which has no stored password.
            Change ADMIN_PASSWORD in the environment and redeploy, or sign in as an
            administrator listed under Administrators.
          </p>
        )}
      </div>
    </>
  );
}
