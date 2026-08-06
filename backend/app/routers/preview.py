from fastapi import APIRouter, HTTPException, Request

from app.admin import ADMIN_PASSWORD, ADMIN_USER

router = APIRouter(prefix="/preview", tags=["preview"])


# Shares the "authenticated" session flag with sqladmin's own login (see
# app/admin.py AdminAuth) — testers sign in once with the admin
# credentials and get both the frontend geofence bypass and /admin access.
@router.get("/session")
async def session_status(request: Request):
    return {"authenticated": bool(request.session.get("authenticated"))}


@router.post("/login")
async def login(request: Request):
    data = await request.json()
    if data.get("username") == ADMIN_USER and data.get("password") == ADMIN_PASSWORD:
        request.session["authenticated"] = True
        return {"ok": True}
    raise HTTPException(status_code=401, detail="Invalid credentials")
