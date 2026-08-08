import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db import get_db
from app.db_models import Feedback

router = APIRouter(prefix="/feedback", tags=["feedback"])


class FeedbackIn(BaseModel):
    rating_navigation: int = Field(ge=1, le=5)
    rating_info_accuracy: int = Field(ge=1, le=5)
    rating_overall: int = Field(ge=1, le=5)
    comment: str | None = None


@router.post("")
async def submit_feedback(payload: FeedbackIn, db: Session = Depends(get_db)):
    comment = (payload.comment or "").strip()[:2000] or None
    db.add(
        Feedback(
            id=uuid.uuid4().hex,
            rating_navigation=payload.rating_navigation,
            rating_info_accuracy=payload.rating_info_accuracy,
            rating_overall=payload.rating_overall,
            comment=comment,
            created_at=datetime.now(timezone.utc).isoformat(),
        )
    )
    db.commit()
    return {"ok": True}
