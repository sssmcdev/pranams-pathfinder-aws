"""One-time data migration: copies every row from the existing SQLite
database into a Postgres database (e.g. an RDS instance), preserving IDs
exactly. The Postgres side's schema is created here directly (not via the
app's own seed-on-first-run path — that only seeds when POIRecord is
empty, and would race with rows this script is about to insert).

Run from backend/, pointed at the SQLite file you're migrating from and
the Postgres database you're migrating to:

    SQLITE_PATH=./wayfinder.db \
    POSTGRES_URL=postgresql://user:password@your-rds-endpoint:5432/dbname \
    ./venv/bin/python -m app.migrate_to_postgres

Safe to re-run: skips any table that already has rows on the Postgres
side rather than duplicating them, so an interrupted run can just be
re-run once the underlying issue is fixed.
"""

import os
import sys

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db import Base
from app.db_models import AnalyticsEvent, DeviceFlag, Feedback, MediaAsset, POIRecord, SubPlace

# SubPlace has a foreign key to POIRecord — POIRecord must land first.
MODELS_IN_ORDER = [POIRecord, SubPlace, MediaAsset, Feedback, AnalyticsEvent, DeviceFlag]


def migrate():
    sqlite_path = os.environ.get("SQLITE_PATH", "./wayfinder.db")
    postgres_url = os.environ.get("POSTGRES_URL")
    if not postgres_url:
        print("Set POSTGRES_URL to the target Postgres connection string, e.g.:")
        print("  POSTGRES_URL=postgresql://user:password@host:5432/dbname")
        sys.exit(1)
    if not os.path.exists(sqlite_path):
        print(f"No SQLite file found at {sqlite_path} — set SQLITE_PATH if it's somewhere else.")
        sys.exit(1)

    sqlite_engine = create_engine(f"sqlite:///{sqlite_path}", connect_args={"check_same_thread": False})
    postgres_engine = create_engine(postgres_url)

    Base.metadata.create_all(bind=postgres_engine)

    SqliteSession = sessionmaker(bind=sqlite_engine)
    PostgresSession = sessionmaker(bind=postgres_engine)
    src = SqliteSession()
    dst = PostgresSession()

    try:
        for model in MODELS_IN_ORDER:
            existing = dst.query(model).count()
            if existing:
                print(f"Skipping {model.__tablename__} — target already has {existing} row(s).")
                continue
            rows = src.query(model).all()
            for row in rows:
                src.expunge(row)
                dst.merge(row)
            dst.commit()
            print(f"Migrated {len(rows)} row(s) into {model.__tablename__}.")
    finally:
        src.close()
        dst.close()

    print("Done. Point DATABASE_URL at the Postgres URL above to switch the app over.")


if __name__ == "__main__":
    migrate()
