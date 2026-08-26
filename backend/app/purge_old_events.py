"""Deletes analytics data older than the retention window (1 year for IP
addresses). Not wired into the app's request path or a scheduler — run it
manually, or point PythonAnywhere's Scheduled Tasks at it, whatever cadence
you prefer (monthly is plenty for a 1-year window).

Run from backend/:
    ./venv/bin/python -m app.purge_old_events
"""

from datetime import datetime, timedelta, timezone

from app.db import SessionLocal
from app.db_models import AnalyticsEvent, DeviceFlag

RETENTION_DAYS = 365


def purge():
    cutoff = (datetime.now(timezone.utc) - timedelta(days=RETENTION_DAYS)).isoformat()
    db = SessionLocal()
    try:
        events_deleted = db.query(AnalyticsEvent).filter(AnalyticsEvent.created_at < cutoff).delete(synchronize_session=False)
        flags_deleted = db.query(DeviceFlag).filter(DeviceFlag.flagged_at < cutoff).delete(synchronize_session=False)
        db.commit()
    finally:
        db.close()

    print(f"Deleted {events_deleted} analytics event(s) and {flags_deleted} device flag(s) older than {RETENTION_DAYS} days.")


if __name__ == "__main__":
    purge()
