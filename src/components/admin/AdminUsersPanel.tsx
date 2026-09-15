"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { MIN_PASSWORD_LENGTH } from "@/lib/password-policy";
import type { AdminUserPublic } from "@/lib/admin-users";

/** ISO-8601 strings, as everything in this schema stores them. */
function when(iso: string | null) {
  return iso ? iso.slice(0, 16).replace("T", " ") : "—";
}

/**
 * Add, reset, deactivate and delete admin accounts.
 *
 * Passwords are typed here by the admin doing the adding and passed on out
 * of band — there is no email delivery in this app, deliberately, and a
 * reset link flow would mean a mail provider, a token table and a domain
 * to verify for the handful of accounts this panel will ever hold.
 *
 * The consequence is that the password is briefly known to two people,
 * which is why every account created or reset here comes back flagged: the
 * new holder cannot use the panel until they have replaced it.
 */
export function AdminUsersPanel({
  rows,
  actorEmail,
}: {
  rows: AdminUserPublic[];
  actorEmail: string | null;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  /** Every mutation reports its failure the same way and then re-renders
   *  the server component, so the table is never guessed at locally. */
  async function call(url: string, init: RequestInit, successNotice: string) {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const res = await fetch(url, init);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.detail ?? "That did not work.");
        return false;
      }
      setNotice(successNotice);
      router.refresh();
      return true;
    } catch {
      setError("Could not reach the server. Please try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="card">
        <h2 className="admin-subhead">Add an administrator</h2>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await call(
              "/api/admin/admins",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
              },
              `Added ${email.trim().toLowerCase()}. Pass the password on to them — they must ` +
                "change it the first time they sign in.",
            );
            if (ok) {
              setEmail("");
              setPassword("");
            }
          }}
        >
          <div className="form-grid">
            <div className="field">
              <label>Email</label>
              <input
                type="email"
                autoComplete="off"
                placeholder="name@example.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <span className="hint">This is what they sign in with.</span>
            </div>
            <div className="field">
              <label>Temporary password</label>
              <input
                type="text"
                autoComplete="off"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={MIN_PASSWORD_LENGTH}
              />
              <span className="hint">
                At least {MIN_PASSWORD_LENGTH} characters. Shown as plain text on purpose —
                you have to read it back to them.
              </span>
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              Add administrator
            </button>
          </div>
        </form>

        {error && <div className="form-error" style={{ marginTop: 14 }}>{error}</div>}
        {notice && <div className="form-ok" style={{ marginTop: 14 }}>{notice}</div>}
      </div>

      <div className="card table-scroll" style={{ marginTop: 18 }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Status</th>
              <th>Added</th>
              <th>Last sign-in</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => {
              const isSelf = actorEmail !== null && a.email === actorEmail;
              return (
                <tr key={a.id}>
                  <td className="wrap">
                    {a.email}
                    {isSelf && <span className="pill-tag" style={{ marginLeft: 8 }}>you</span>}
                  </td>
                  <td>
                    {!a.active ? (
                      <span className="pill-tag pill-off">Deactivated</span>
                    ) : a.mustChangePassword ? (
                      <span className="pill-tag">Must set password</span>
                    ) : (
                      <span className="pill-tag">Active</span>
                    )}
                  </td>
                  <td style={{ whiteSpace: "nowrap", fontSize: 12 }}>{when(a.createdAt)}</td>
                  <td style={{ whiteSpace: "nowrap", fontSize: 12 }}>{when(a.lastLoginAt)}</td>
                  <td>
                    <div className="admin-row-actions">
                      <button
                        type="button"
                        className="btn"
                        disabled={busy}
                        onClick={async () => {
                          const next = prompt(
                            `New temporary password for ${a.email}.\n\n` +
                              `At least ${MIN_PASSWORD_LENGTH} characters. They will have to ` +
                              "change it the next time they sign in.",
                          );
                          if (next === null) return;
                          await call(
                            `/api/admin/admins/${a.id}`,
                            {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ password: next }),
                            },
                            `Password reset for ${a.email}. Pass the new one on to them.`,
                          );
                        }}
                      >
                        Reset password
                      </button>

                      <button
                        type="button"
                        className="btn"
                        disabled={busy || isSelf}
                        title={isSelf ? "You cannot deactivate your own account" : undefined}
                        onClick={() =>
                          call(
                            `/api/admin/admins/${a.id}`,
                            {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ active: !a.active }),
                            },
                            a.active ? `${a.email} deactivated.` : `${a.email} reactivated.`,
                          )
                        }
                      >
                        {a.active ? "Deactivate" : "Reactivate"}
                      </button>

                      <button
                        type="button"
                        className="btn btn-danger"
                        disabled={busy || isSelf}
                        title={isSelf ? "You cannot delete your own account" : undefined}
                        onClick={() => {
                          if (!confirm(`Remove ${a.email} as an administrator?`)) return;
                          void call(
                            `/api/admin/admins/${a.id}`,
                            { method: "DELETE" },
                            `${a.email} removed.`,
                          );
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="admin-empty">
            No administrator accounts yet — you are signed in with the environment account.
            Add one above.
          </p>
        )}
      </div>
    </>
  );
}
