from sqlalchemy import Boolean, Float, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class POIRecord(Base):
    __tablename__ = "pois"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    name_te: Mapped[str | None] = mapped_column(String, nullable=True)
    name_hi: Mapped[str | None] = mapped_column(String, nullable=True)
    category: Mapped[str] = mapped_column(String, nullable=False, index=True)
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lon: Mapped[float] = mapped_column(Float, nullable=False)

    description: Mapped[str | None] = mapped_column(String, nullable=True)
    description_te: Mapped[str | None] = mapped_column(String, nullable=True)
    description_hi: Mapped[str | None] = mapped_column(String, nullable=True)
    search_terms: Mapped[str | None] = mapped_column(String, nullable=True)
    opening_hours: Mapped[str | None] = mapped_column(String, nullable=True)
    opening_hours_te: Mapped[str | None] = mapped_column(String, nullable=True)
    opening_hours_hi: Mapped[str | None] = mapped_column(String, nullable=True)
    closed_override: Mapped[bool] = mapped_column(Boolean, default=False)
    accessible: Mapped[bool] = mapped_column(Boolean, default=False)
    gender: Mapped[str | None] = mapped_column(String, nullable=True)  # ladies / gents / unisex
    capacity_note: Mapped[str | None] = mapped_column(String, nullable=True)
    capacity_note_te: Mapped[str | None] = mapped_column(String, nullable=True)
    capacity_note_hi: Mapped[str | None] = mapped_column(String, nullable=True)
    maintained_by: Mapped[str | None] = mapped_column(String, nullable=True)
    photo_url: Mapped[str | None] = mapped_column(String, nullable=True)
    maps_url: Mapped[str | None] = mapped_column(String, nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)

    @property
    def is_open(self) -> bool:
        return not self.closed_override

    def __str__(self) -> str:
        return self.name
