from fastapi import APIRouter, HTTPException, Query, Request

from app.maps_link import extract_latlon

router = APIRouter(prefix="/admin-tools", tags=["admin-tools"])


def require_admin_session(request: Request) -> None:
    if not request.session.get("authenticated"):
        raise HTTPException(status_code=401, detail="Admin login required")


@router.get("/parse-maps-url")
def parse_maps_url(request: Request, url: str = Query(...)):
    require_admin_session(request)
    result = extract_latlon(url)
    if result is None:
        raise HTTPException(
            status_code=422,
            detail="Couldn't find coordinates in that link. Try pasting the full URL from the browser address bar, or paste raw coordinates like '14.1666, 77.8033'.",
        )
    lat, lon = result
    return {"lat": lat, "lon": lon}
