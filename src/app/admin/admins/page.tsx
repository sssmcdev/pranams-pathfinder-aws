import { AdminUsersPanel } from "@/components/admin/AdminUsersPanel";
import { listAdmins } from "@/lib/admin-users";
import { adminPageAllowed, currentAdminEmail } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminsPage() {
  if (!(await adminPageAllowed())) return null;

  // Sequential, not Promise.all — the shared postgres client is max:1 and
  // deadlocks on pipelined queries. See the note in db/index.ts.
  const rows = await listAdmins();
  const actor = await currentAdminEmail();

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>Administrators</h1>
          <p className="muted">
            Everyone here can sign in to the admin panel, the analytics dashboard and the
            preview app — there are no separate permission levels. New accounts and reset
            accounts must choose their own password before they can do anything.
          </p>
        </div>
      </div>

      <AdminUsersPanel rows={rows} actorEmail={actor} />
    </>
  );
}
