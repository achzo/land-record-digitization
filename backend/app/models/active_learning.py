from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import Integer, String, Float, Text, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ActiveLearningSample(Base):
    """Stores verified ground-truth samples for active-learning retraining.

    CRITICAL RULE:
    Only samples explicitly confirmed or corrected by a human reviewer are stored here.
    Model predictions are NEVER treated as ground truth automatically.
    """

    __tablename__ = "active_learning_samples"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    extracted_field_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("extracted_fields.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
        doc="Reference to original low-confidence extracted field",
    )
    document_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Parent document ID",
    )
    crop_image_path: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
        doc="Filesystem or MinIO key to isolated segment image crop",
    )
    image_hash: Mapped[Optional[str]] = mapped_column(
        String(64),
        nullable=True,
        index=True,
        doc="SHA-256 hash of crop image to enforce duplicate rejection",
    )
    original_prediction: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        doc="Original OCR hypothesis (for historical reference only, not training label)",
    )
    verified_text: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        doc="Strictly human-confirmed or corrected ground truth transcription",
    )
    verified_by_human: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        doc="Must always be True for active learning samples",
    )
    confidence_score: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
        doc="Original OCR confidence score",
    )
    language_script: Mapped[str] = mapped_column(
        String(100),
        default="kannada_handwritten",
        nullable=False,
        index=True,
    )
    reviewer_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
        doc="User ID of human reviewer who approved or corrected this sample",
    )
    verified_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )
    split: Mapped[str] = mapped_column(
        String(20),
        default="TRAIN",
        nullable=False,
        index=True,
        doc="TRAIN, VAL, TEST_HARD",
    )
    used_in_training_run_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("training_runs.id"),
        nullable=True,
        index=True,
        doc="Foreign key to training run when consumed",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    extracted_field = relationship("ExtractedField", back_populates="active_learning_sample")
    document = relationship("Document")
    reviewer = relationship("User")
    training_run = relationship("TrainingRun", back_populates="samples")

    def __repr__(self) -> str:
        return (
            f"<ActiveLearningSample(id={self.id}, field_id={self.extracted_field_id}, "
            f"verified_len={len(self.verified_text)}, split='{self.split}')>"
        )
