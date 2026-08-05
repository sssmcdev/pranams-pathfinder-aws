import os
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile
from sqlalchemy.orm import Session

from app.db import get_db
from app.db_models import MediaAsset
from app.maps_link import extract_latlon

router = APIRouter(prefix="/admin-tools", tags=["admin-tools"])

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "frontend", "assets", "uploads")
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
MAX_UPLOAD_BYTES = 8 * 1024 * 1024  # 8 MB


def require_admin_session(request: Request) -> None:
    if not request.session.get("authenticated"):
        raise HTTPException(status_code=401, detail="Admin login required")


@router.get("/parse-maps-url")
async def parse_maps_url(request: Request, url: str = Query(...)):
    require_admin_session(request)
    result = extract_latlon(url)
    if result is None:
        raise HTTPException(
            status_code=422,
            detail="Couldn't find coordinates in that link. Try pasting the full URL from the browser address bar, or paste raw coordinates like '14.1666, 77.8033'.",
        )
    lat, lon = result
    return {"lat": lat, "lon": lon}


@router.get("/media")
async def list_media(request: Request, db: Session = Depends(get_db)):
    require_admin_session(request)
    assets = db.query(MediaAsset).order_by(MediaAsset.uploaded_at.desc()).all()
    return [{"id": a.id, "url": a.url, "name": a.original_filename} for a in assets]


@router.post("/media")
async def upload_media(request: Request, file: UploadFile, db: Session = Depends(get_db)):
    require_admin_session(request)

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=422, detail=f"Unsupported file type. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}")

    contents = await file.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=422, detail="Image is too large (max 8 MB).")

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    stored_name = f"{uuid.uuid4().hex}{ext}"
    with open(os.path.join(UPLOAD_DIR, stored_name), "wb") as f:
        f.write(contents)

    asset = MediaAsset(
        id=uuid.uuid4().hex,
        url=f"assets/uploads/{stored_name}",
        original_filename=file.filename or stored_name,
        uploaded_at=datetime.now(timezone.utc).isoformat(),
    )
    db.add(asset)
    db.commit()
    return {"id": asset.id, "url": asset.url, "name": asset.original_filename}
