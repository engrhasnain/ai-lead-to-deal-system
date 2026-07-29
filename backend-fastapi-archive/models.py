from datetime import datetime
from sqlalchemy import Integer, String, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class Lead(Base):
    __tablename__ = "leads"

    id:               Mapped[int]           = mapped_column(Integer, primary_key=True)
    name:             Mapped[str]           = mapped_column(String(200))
    email:            Mapped[str]           = mapped_column(String(200))
    company:          Mapped[str]           = mapped_column(String(200))
    title:            Mapped[str]           = mapped_column(String(200))
    industry:         Mapped[str]           = mapped_column(String(100))
    source:           Mapped[str]           = mapped_column(String(100), default="manual")
    stage:            Mapped[str]           = mapped_column(String(50), default="new")
    score:            Mapped[int | None]    = mapped_column(Integer, nullable=True)
    score_reasoning:  Mapped[str | None]    = mapped_column(Text, nullable=True)
    deal_value:       Mapped[float | None]  = mapped_column(Float, nullable=True)
    currency:         Mapped[str]           = mapped_column(String(10), default="USD")
    next_action:      Mapped[str | None]    = mapped_column(Text, nullable=True)
    ai_summary:       Mapped[str | None]    = mapped_column(Text, nullable=True)
    icp_fit:          Mapped[str | None]    = mapped_column(String(20), nullable=True)
    enriched_at:      Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    notes:            Mapped[str | None]    = mapped_column(Text, nullable=True)
    lost_reason:      Mapped[str | None]    = mapped_column(String(200), nullable=True)
    stage_entered_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at:       Mapped[datetime]      = mapped_column(DateTime, default=datetime.utcnow)
    updated_at:       Mapped[datetime]      = mapped_column(DateTime, default=datetime.utcnow)

    emails: Mapped[list["Email"]] = relationship(
        "Email", back_populates="lead", cascade="all, delete-orphan", lazy="selectin"
    )
    activities: Mapped[list["LeadActivity"]] = relationship(
        "LeadActivity", back_populates="lead", cascade="all, delete-orphan",
        lazy="selectin", order_by="LeadActivity.created_at.desc()"
    )


class Email(Base):
    __tablename__ = "emails"

    id:           Mapped[int]      = mapped_column(Integer, primary_key=True)
    lead_id:      Mapped[int]      = mapped_column(Integer, ForeignKey("leads.id"))
    email_type:   Mapped[str]      = mapped_column(String(50))
    subject:      Mapped[str]      = mapped_column(String(500))
    body:         Mapped[str]      = mapped_column(Text)
    generated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    opened_at:    Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    lead: Mapped["Lead"] = relationship("Lead", back_populates="emails")


class LeadActivity(Base):
    __tablename__ = "lead_activities"

    id:          Mapped[int]      = mapped_column(Integer, primary_key=True)
    lead_id:     Mapped[int]      = mapped_column(Integer, ForeignKey("leads.id"))
    event_type:  Mapped[str]      = mapped_column(String(50))
    description: Mapped[str]      = mapped_column(String(500))
    created_at:  Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    lead: Mapped["Lead"] = relationship("Lead", back_populates="activities")
