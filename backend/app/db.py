import os

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# Absolute path — anchored to this file, not the process's working directory,
# which isn't reliably predictable under a WSGI host like PythonAnywhere.
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_DEFAULT_SQLITE_URL = f"sqlite:///{os.path.join(BACKEND_DIR, 'wayfinder.db')}"

# Unset (local dev, PA) -> same SQLite file as always. Set DATABASE_URL to a
# postgresql://... URL (e.g. an RDS endpoint) to run against Postgres instead
# — no other code change needed, every model/query here is dialect-neutral
# SQLAlchemy. check_same_thread is a SQLite-only connect arg; passing it to
# psycopg2 would be a TypeError, so it's applied conditionally.
DATABASE_URL = os.environ.get("DATABASE_URL", _DEFAULT_SQLITE_URL)
_connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=_connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
