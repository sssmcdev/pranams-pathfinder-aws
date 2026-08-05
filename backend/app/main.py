import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqladmin import Admin
from starlette.middleware.sessions import SessionMiddleware

from app.admin import AdminAuth, MediaAssetAdmin, POIAdmin, SESSION_SECRET, SubPlaceAdmin
from app.db import engine
from app.routers import admin_tools, pois
from app.seed import init_db_and_seed

ADMIN_TEMPLATES_DIR = os.path.join(os.path.dirname(__file__), "admin_templates")

# Run at import time, not via ASGI lifespan — a2wsgi (needed to host this
# ASGI app on a WSGI-only host like PythonAnywhere) never sends a lifespan
# event, so anything registered there would silently never run.
init_db_and_seed()

app = FastAPI(title="Prasanthi Nilayam Wayfinder API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)
app.add_middleware(SessionMiddleware, secret_key=SESSION_SECRET)

app.include_router(pois.router)
app.include_router(admin_tools.router)

admin = Admin(
    app,
    engine,
    authentication_backend=AdminAuth(secret_key=SESSION_SECRET),
    templates_dir=ADMIN_TEMPLATES_DIR,
)
admin.add_view(POIAdmin)
admin.add_view(SubPlaceAdmin)
admin.add_view(MediaAssetAdmin)


@app.get("/health")
async def health():
    return {"status": "ok"}
