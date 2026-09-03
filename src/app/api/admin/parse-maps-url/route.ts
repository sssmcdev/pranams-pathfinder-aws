import { adminRoute } from "@/lib/admin-route";
import { ValidationError } from "@/lib/admin-service";
import { extractLatLon } from "@/lib/maps-link";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return adminRoute(async () => {
    const url = new URL(request.url).searchParams.get("url");
    if (!url) throw new ValidationError("No URL given");
    const result = await extractLatLon(url);
    if (!result) {
      throw new ValidationError(
        "Couldn't find coordinates in that link. Try pasting the full URL from the " +
          "browser address bar, or paste raw coordinates like '14.1666, 77.8033'.",
      );
    }
    return result;
  });
}
