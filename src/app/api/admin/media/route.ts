import { randomUUID } from "node:crypto";

import { db } from "@/db";
import { mediaAssets } from "@/db/schema";
import { adminRoute } from "@/lib/admin-route";
import { listMediaAdmin, ValidationError } from "@/lib/admin-service";

export const dynamic = "force-dynamic";

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB, as in admin_tools.py

export async function GET() {
  return adminRoute(async () =>
    (await listMediaAdmin()).map((a) => ({ id: a.id, url: a.url, name: a.originalFilename })),
  );
}

export async function POST(request: Request) {
  return adminRoute(async () => {
    // Local disk is not writable on Vercel, so uploads go to Blob storage
    // rather than frontend/assets/uploads as they did on PythonAnywhere.
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new ValidationError(
        "Image uploads are not configured yet. Add a Vercel Blob store to this project " +
          "and set BLOB_READ_WRITE_TOKEN, then try again.",
      );
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new ValidationError("No file was uploaded");

    const dot = file.name.lastIndexOf(".");
    const ext = dot === -1 ? "" : file.name.slice(dot).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      throw new ValidationError(
        `Unsupported file type. Allowed: ${[...ALLOWED_EXTENSIONS].sort().join(", ")}`,
      );
    }
    if (file.size > MAX_UPLOAD_BYTES) throw new ValidationError("Image is too large (max 8 MB).");

    const { put } = await import("@vercel/blob");
    const storedName = `${randomUUID().replace(/-/g, "")}${ext}`;
    const blob = await put(`uploads/${storedName}`, file, { access: "public" });

    const asset = {
      id: randomUUID().replace(/-/g, ""),
      url: blob.url,
      originalFilename: file.name,
      uploadedAt: new Date().toISOString(),
    };
    await db.insert(mediaAssets).values(asset);
    return { id: asset.id, url: asset.url, name: asset.originalFilename };
  });
}
