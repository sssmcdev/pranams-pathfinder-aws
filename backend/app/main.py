import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse, Response
from sqladmin import Admin
from starlette.middleware.sessions import SessionMiddleware
from starlette.requests import Request

from app.admin import AdminAuth, FeedbackAdmin, MediaAssetAdmin, POIAdmin, SESSION_SECRET, SubPlaceAdmin
from app.db import engine
from app.routers import admin_tools, analytics, feedback, pois, preview
from app.seed import init_db_and_seed

ADMIN_TEMPLATES_DIR = os.path.join(os.path.dirname(__file__), "admin_templates")
FRONTEND_DIR = (Path(__file__).resolve().parent / ".." / ".." / "frontend").resolve()
FRONTEND_CONTENT_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
}

# Run at import time, not via ASGI lifespan — our WSGI adapter (needed to
# host this ASGI app on a WSGI-only server like PythonAnywhere's uWSGI)
# never sends a lifespan event, so anything registered there would
# silently never run.
init_db_and_seed()

app = FastAPI(title="Prasanthi Nilayam Wayfinder API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)
app.add_middleware(SessionMiddleware, secret_key=SESSION_SECRET)


# A 404 from a browser navigation (Accept: text/html — real page loads,
# not fetch() calls, which don't send that by default) gets the branded
# error page instead of raw JSON. Every other status/exception keeps
# FastAPI's normal {"detail": ...} response, matching its own default
# handler exactly, so nothing else changes.
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    if exc.status_code == 404 and "text/html" in request.headers.get("accept", ""):
        return Response(content=(FRONTEND_DIR / "404.html").read_bytes(), media_type="text/html; charset=utf-8", status_code=404)
    return JSONResponse({"detail": exc.detail}, status_code=exc.status_code)


app.include_router(pois.router)
app.include_router(admin_tools.router)
app.include_router(preview.router)
app.include_router(analytics.router)
app.include_router(feedback.router)

admin = Admin(
    app,
    engine,
    authentication_backend=AdminAuth(secret_key=SESSION_SECRET),
    templates_dir=ADMIN_TEMPLATES_DIR,
)
admin.add_view(POIAdmin)
admin.add_view(SubPlaceAdmin)
admin.add_view(MediaAssetAdmin)
admin.add_view(FeedbackAdmin)


# sqladmin's mount only matches paths with a trailing slash
# (^/admin/(?P<path>.*)$), so bare "/admin" normally falls through to
# Starlette's automatic slash-redirect. The catch-all route below would
# intercept it first and 404 instead, so redirect explicitly.
@app.get("/admin", include_in_schema=False)
async def admin_redirect():
    return RedirectResponse(url="/admin/")


@app.get("/health")
async def health():
    return {"status": "ok"}


# Same SPA shell as "/" — app.js checks the path client-side and, for
# this one, shows an admin-credential login (via preview.router above)
# instead of the geolocation gate. Testing-only access, off the home URL.
@app.get("/preview", include_in_schema=False)
async def preview_shell():
    return Response(content=(FRONTEND_DIR / "index.html").read_bytes(), media_type="text/html; charset=utf-8")


# A separate dashboard page, not the visitor app's mobile shell — reuses
# the /preview session-check and login endpoints (same "authenticated"
# session flag), so there's one login, not a second credential path.
@app.get("/analytics", include_in_schema=False)
async def analytics_shell():
    return Response(content=(FRONTEND_DIR / "analytics.html").read_bytes(), media_type="text/html; charset=utf-8")


# Registered last on purpose — "/{path:path}" would otherwise swallow every
# request (including /pois, /admin, /health) since more specific routes
# only win if they're registered first.
#
# This isn't Starlette's StaticFiles because StaticFiles reads files via
# anyio's threaded file I/O, which needs real OS threads — unavailable in
# PythonAnywhere's uWSGI config (see wsgi_adapter.py). Reading the file
# directly, synchronously, inside an async route runs it on the event
# loop thread instead, with no thread pool involved. Re-reading from disk
# on every request (rather than caching at import time) is deliberate too:
# admin-uploaded photos land in assets/uploads/ after the app has already
# started, and still need to be servable immediately.
@app.get("/{path:path}")
async def frontend(path: str):
    target = (FRONTEND_DIR / (path or "index.html")).resolve()
    if target.is_dir():
        target = target / "index.html"
    if not target.is_relative_to(FRONTEND_DIR) or not target.is_file():
        raise HTTPException(status_code=404, detail="Not Found")
    content_type = FRONTEND_CONTENT_TYPES.get(target.suffix, "application/octet-stream")
    return Response(content=target.read_bytes(), media_type=content_type)
