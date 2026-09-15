import { listPoisAdmin } from "@/lib/admin-service";
import { adminPageAllowed } from "@/lib/session";
import { SubPlaceForm } from "@/components/admin/SubPlaceForm";

export const dynamic = "force-dynamic";

export default async function NewSubPlacePage() {
  if (!(await adminPageAllowed())) return null;
  const pois = await listPoisAdmin();
  return (
    <>
      <div className="admin-head">
        <div>
          <h1>New sub-place</h1>
        </div>
      </div>
      <SubPlaceForm
        subPlace={null}
        poiOptions={pois.map((p) => ({ value: p.id, label: p.name }))}
      />
    </>
  );
}
