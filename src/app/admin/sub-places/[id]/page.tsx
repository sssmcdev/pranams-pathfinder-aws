import { notFound } from "next/navigation";

import { getSubPlaceAdmin, listPoisAdmin } from "@/lib/admin-service";
import { isAuthenticated } from "@/lib/session";
import { SubPlaceForm } from "@/components/admin/SubPlaceForm";

export const dynamic = "force-dynamic";

export default async function EditSubPlacePage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return null;
  const sub = await getSubPlaceAdmin((await params).id);
  if (!sub) notFound();
  const pois = await listPoisAdmin();

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>{sub.name}</h1>
          <p className="muted">{sub.id}</p>
        </div>
      </div>
      <SubPlaceForm
        subPlace={sub}
        poiOptions={pois.map((p) => ({ value: p.id, label: p.name }))}
      />
    </>
  );
}
