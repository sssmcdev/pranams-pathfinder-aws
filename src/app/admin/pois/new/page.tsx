import { PoiForm } from "@/components/admin/PoiForm";

export default function NewPoiPage() {
  return (
    <>
      <div className="admin-head">
        <div>
          <h1>New place</h1>
        </div>
      </div>
      <PoiForm poi={null} />
    </>
  );
}
