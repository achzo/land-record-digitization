from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from sqlalchemy import Integer, String, Boolean, DateTime, ForeignKey, JSON, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ModelCheckpoint(Base):
    """Tracks model weights, versions, and deployment promotion states."""

    __tablename__ = "model_checkpoints"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    version_tag: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    checkpoint_path: Mapped[str] = mapped_column(String(500), nullable=False)
    status: Mapped[str] = mapped_column(
        String(50),
        default="CANDIDATE",
        nullable=False,
        index=True,
        doc="CANDIDATE, PRODUCTION, REJECTED, ARCHIVED",
    )
    is_production: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    evaluation_metrics: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=True,
        doc="CER, WER, exact_match, avg_confidence, human_review_rate",
    )
    baseline_comparison: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=True,
        doc="Improvement deltas and regression checks against baseline",
    )
    promoted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    promoted_by_user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )

    promoted_by = relationship("User", foreign_keys=[promoted_by_user_id])
    training_runs = relationship("TrainingRun", back_populates="candidate_checkpoint", foreign_keys="TrainingRun.candidate_checkpoint_id")

    def __repr__(self) -> str:
        return f"<ModelCheckpoint(id={self.id}, tag='{self.version_tag}', status='{self.status}', prod={self.is_production})>"


class TrainingRun(Base):
    """Records manually-triggered active learning candidate training sessions."""

    __tablename__ = "training_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    triggered_by_user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    status: Mapped[str] = mapped_column(
        String(50),
        default="PENDING",
        nullable=False,
        index=True,
        doc="PENDING, TRAINING, EVALUATING, COMPLETED, FAILED",
    )
    base_checkpoint: Mapped[str] = mapped_column(
        String(200),
        default="kannada-trocr-production",
        nullable=False,
        doc="Starting production checkpoint tag",
    )
    candidate_checkpoint_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("model_checkpoints.id"),
        nullable=True,
    )
    num_samples_used: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    metrics: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    triggered_by = relationship("User", foreign_keys=[triggered_by_user_id])
    candidate_checkpoint = relationship("ModelCheckpoint", back_populates="training_runs", foreign_keys=[candidate_checkpoint_id])
    samples = relationship("ActiveLearningSample", back_populates="training_run")

    def __repr__(self) -> str:
        return f"<TrainingRun(id={self.id}, status='{self.status}', samples={self.num_samples_used})>"
