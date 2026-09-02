import { notFound } from "next/navigation";

import { getPoiAdmin } from "@/lib/admin-service";
import { isAuthenticated } from "@/lib/session";
import { PoiForm } from "@/components/admin/PoiForm";

export const dynamic = "force-dynamic";

export default async function EditPoiPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return null;
  const poi = await getPoiAdmin((await params).id);
  if (!poi) notFound();

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>{poi.name}</h1>
          <p className="muted">{poi.id}</p>
        </div>
      </div>
      <PoiForm poi={poi} />
    </>
  );
}
