from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import select, update

from app.models.model_registry import ModelCheckpoint, TrainingRun
from app.training.evaluator import EvaluationSuite
from app.core.al_config import active_learning_config


class ModelPromotionService:
    """Manages model checkpoint registry, promotion gates, and rollbacks."""

    DEFAULT_PROD_TAG = "kannada-trocr-prod-v1.0"
    DEFAULT_PROD_PATH = "models/kannada_trocr/production/v1.0"

    @classmethod
    def get_active_production_checkpoint(cls, db: Session) -> ModelCheckpoint:
        """Fetch current production checkpoint or initialize default record if missing."""
        stmt = select(ModelCheckpoint).where(ModelCheckpoint.is_production == True)
        prod = db.execute(stmt).scalar_one_or_none()
        if not prod:
            prod = ModelCheckpoint(
                version_tag=cls.DEFAULT_PROD_TAG,
                checkpoint_path=cls.DEFAULT_PROD_PATH,
                status="PRODUCTION",
                is_production=True,
                evaluation_metrics={
                    "available": False,
                    "message": "Baseline production checkpoint. Benchmark evaluation not yet configured.",
                },
                baseline_comparison=None,
                promoted_at=datetime.now(timezone.utc),
            )
            db.add(prod)
            db.commit()
            db.refresh(prod)
        return prod

    @classmethod
    def check_promotion_eligibility(
        cls,
        candidate: ModelCheckpoint,
        baseline: ModelCheckpoint,
    ) -> Dict[str, Any]:
        """Verify that candidate passes all strict promotion criteria."""
        cand_metrics = candidate.evaluation_metrics or {}
        base_metrics = baseline.evaluation_metrics or {}

        res = EvaluationSuite.evaluate_candidate_checkpoint(
            candidate_eval=cand_metrics,
            baseline_eval=base_metrics,
            tolerance=active_learning_config.tolerance,
            min_improvement=active_learning_config.min_improvement,
        )
        return res

    @classmethod
    def promote_candidate(
        cls,
        candidate_id: int,
        user_id: int,
        db: Session,
        force: bool = False,
    ) -> ModelCheckpoint:
        """Promote candidate checkpoint to production status.

        Rules:
        - Only promotes if promotion criteria are met (unless force=True).
        - Changes previous production status to ARCHIVED.
        - Sets candidate status to PRODUCTION.
        """
        stmt = select(ModelCheckpoint).where(ModelCheckpoint.id == candidate_id)
        candidate = db.execute(stmt).scalar_one_or_none()
        if not candidate:
            raise ValueError(f"Candidate checkpoint ID {candidate_id} not found.")

        current_prod = cls.get_active_production_checkpoint(db)

        if not force:
            eligibility = cls.check_promotion_eligibility(candidate, current_prod)
            if not eligibility.get("recommend_promotion", False):
                reasons = ", ".join(eligibility.get("reasons", ["Promotion criteria not met."]))
                raise ValueError(f"Cannot promote candidate {candidate.version_tag}: {reasons}")

        # Demote current production
        current_prod.is_production = False
        current_prod.status = "ARCHIVED"

        # Promote candidate
        candidate.status = "PRODUCTION"
        candidate.is_production = True
        candidate.promoted_at = datetime.now(timezone.utc)
        candidate.promoted_by_user_id = user_id

        db.commit()
        db.refresh(candidate)
        return candidate

    @classmethod
    def reject_candidate(
        cls,
        candidate_id: int,
        db: Session,
        reason: Optional[str] = None,
    ) -> ModelCheckpoint:
        """Explicitly mark a candidate as REJECTED."""
        stmt = select(ModelCheckpoint).where(ModelCheckpoint.id == candidate_id)
        candidate = db.execute(stmt).scalar_one_or_none()
        if not candidate:
            raise ValueError(f"Candidate checkpoint ID {candidate_id} not found.")

        if candidate.is_production:
            raise ValueError("Cannot reject the active production checkpoint.")

        candidate.status = "REJECTED"
        if reason:
            metrics = candidate.evaluation_metrics or {}
            metrics["rejection_reason"] = reason
            candidate.evaluation_metrics = metrics

        db.commit()
        db.refresh(candidate)
        return candidate

    @classmethod
    def rollback_to(
        cls,
        target_checkpoint_id: int,
        user_id: int,
        db: Session,
    ) -> ModelCheckpoint:
        """Rollback active production to an archived or previous checkpoint."""
        stmt = select(ModelCheckpoint).where(ModelCheckpoint.id == target_checkpoint_id)
        target = db.execute(stmt).scalar_one_or_none()
        if not target:
            raise ValueError(f"Target checkpoint ID {target_checkpoint_id} not found.")

        current_prod = cls.get_active_production_checkpoint(db)
        if current_prod.id == target.id:
            return current_prod

        # Demote current
        current_prod.is_production = False
        current_prod.status = "ARCHIVED"

        # Restore target
        target.is_production = True
        target.status = "PRODUCTION"
        target.promoted_at = datetime.now(timezone.utc)
        target.promoted_by_user_id = user_id

        db.commit()
        db.refresh(target)
        return target


promotion_service = ModelPromotionService()
