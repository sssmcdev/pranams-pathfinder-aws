"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteButton({
  endpoint,
  label,
  confirmText,
}: {
  endpoint: string;
  label: string;
  confirmText: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      className="btn btn-danger"
      disabled={busy}
      onClick={async () => {
        if (!confirm(confirmText)) return;
        setBusy(true);
        try {
          await fetch(endpoint, { method: "DELETE" });
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? "…" : label}
    </button>
  );
}
