from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.api.deps import get_db, require_admin, require_reviewer_or_above
from app.models.user import User
from app.models.active_learning import ActiveLearningSample
from app.models.model_registry import ModelCheckpoint, TrainingRun
from app.schemas.training import (
    TrainingStatusResponse,
    TrainingTriggerRequest,
    TrainingTriggerResponse,
    TrainingRunItem,
    EvaluationResponse,
    PromotionResponse,
)
from app.core.al_config import active_learning_config
from app.training.promoter import promotion_service
from app.training.trainer import kannada_training_adapter
from app.training.evaluator import EvaluationSuite

router = APIRouter()


@router.get(
    "/status",
    response_model=TrainingStatusResponse,
    summary="Get Active Learning & Model Status",
    description="Check current production checkpoint, verified sample accumulation, and training readiness.",
)
def get_training_status(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(require_reviewer_or_above),
) -> TrainingStatusResponse:
    """Retrieve production model information and verified sample count."""
    prod = promotion_service.get_active_production_checkpoint(db)

    # Count unused verified samples
    unused_stmt = select(func.count(ActiveLearningSample.id)).where(
        ActiveLearningSample.verified_by_human == True,
        ActiveLearningSample.used_in_training_run_id == None,
    )
    verified_count = db.execute(unused_stmt).scalar_one()

    # Active running job if any
    active_run_stmt = select(TrainingRun).where(
        TrainingRun.status.in_(["PENDING", "TRAINING", "EVALUATING"])
    ).order_by(TrainingRun.id.desc()).limit(1)
    active_run = db.execute(active_run_stmt).scalar_one_or_none()

    total_runs = db.execute(select(func.count(TrainingRun.id))).scalar_one()
    threshold = active_learning_config.min_verified_samples_for_training

    return TrainingStatusResponse(
        active_learning_enabled=active_learning_config.enabled,
        current_production_checkpoint=prod.version_tag,
        production_checkpoint_path=prod.checkpoint_path,
        verified_samples_count=verified_count,
        min_verified_samples_for_training=threshold,
        ready_to_train=verified_count >= threshold,
        active_training_run={
            "id": active_run.id,
            "status": active_run.status,
            "started_at": active_run.started_at.isoformat(),
        } if active_run else None,
        total_training_runs=total_runs,
    )


@router.post(
    "/trigger",
    response_model=TrainingTriggerResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Manually Trigger Candidate Training (ADMIN Only)",
    description="Trigger an active learning training session. Requires at least min_verified_samples (default 20).",
)
def trigger_training(
    payload: TrainingTriggerRequest = TrainingTriggerRequest(),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(require_admin),
) -> TrainingTriggerResponse:
    """Manually initiate candidate fine-tuning run from accumulated verified samples."""
    user_id = current_user.id if current_user else 1

    # Check for active running job
    active_run_stmt = select(TrainingRun).where(
        TrainingRun.status.in_(["PENDING", "TRAINING", "EVALUATING"])
    )
    if db.execute(active_run_stmt).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A training run is already in progress. Wait for it to finish before starting a new run.",
        )

    # 1. Gather all unused verified samples
    samples_stmt = select(ActiveLearningSample).where(
        ActiveLearningSample.verified_by_human == True,
        ActiveLearningSample.used_in_training_run_id == None,
    )
    verified_samples = list(db.execute(samples_stmt).scalars().all())

    threshold = active_learning_config.min_verified_samples_for_training
    if len(verified_samples) < threshold:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Insufficient verified samples: {len(verified_samples)} available, "
                f"but at least {threshold} verified samples are required to trigger training."
            ),
        )

    prod = promotion_service.get_active_production_checkpoint(db)

    # 2. Create TrainingRun record
    training_run = TrainingRun(
        triggered_by_user_id=user_id,
        status="TRAINING",
        base_checkpoint=prod.version_tag,
        num_samples_used=len(verified_samples),
        started_at=datetime.now(timezone.utc),
    )
    db.add(training_run)
    db.commit()
    db.refresh(training_run)

    # 3. Associate samples with this training run
    for s in verified_samples:
        s.used_in_training_run_id = training_run.id
    db.commit()

    # 4. Prepare training dataset & candidate checkpoint record
    training_data = kannada_training_adapter.prepare_training_dataset(verified_samples)
    candidate_tag = f"kannada-trocr-candidate-run-{training_run.id}"
    candidate_path = f"models/kannada_trocr/candidates/run_{training_run.id}"

    candidate_cp = ModelCheckpoint(
        version_tag=candidate_tag,
        checkpoint_path=candidate_path,
        status="CANDIDATE",
        is_production=False,
        evaluation_metrics={
            "available": False,
            "message": "Candidate training initiated. Benchmark evaluation pending/unavailable.",
        },
    )
    db.add(candidate_cp)
    db.commit()
    db.refresh(candidate_cp)

    # 5. Connect candidate to training run & simulate run completion
    training_run.candidate_checkpoint_id = candidate_cp.id
    kannada_training_adapter.execute_training_run(
        run_id=training_run.id,
        base_checkpoint_path=prod.checkpoint_path,
        output_candidate_path=candidate_path,
        training_data=training_data,
    )

    training_run.status = "COMPLETED"
    training_run.completed_at = datetime.now(timezone.utc)
    training_run.metrics = {
        "train_samples": training_data["train_count"],
        "val_samples": training_data["val_count"],
        "total_samples": training_data["total_samples"],
        "status": "CANDIDATE_READY_FOR_EVALUATION",
    }
    db.commit()
    db.refresh(training_run)

    return TrainingTriggerResponse(
        success=True,
        message=f"Candidate training run #{training_run.id} completed. Checkpoint {candidate_tag} created.",
        training_run_id=training_run.id,
        status=training_run.status,
        samples_used=len(verified_samples),
    )


@router.get(
    "/runs",
    response_model=List[TrainingRunItem],
    summary="List Training Runs",
    description="Retrieve all candidate training runs with their candidate checkpoint statuses.",
)
def list_training_runs(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(require_reviewer_or_above),
) -> List[TrainingRunItem]:
    """List historical training runs."""
    stmt = select(TrainingRun).order_by(TrainingRun.id.desc()).offset(skip).limit(limit)
    runs = db.execute(stmt).scalars().all()

    items = []
    for r in runs:
        cand_tag = r.candidate_checkpoint.version_tag if r.candidate_checkpoint else None
        cand_status = r.candidate_checkpoint.status if r.candidate_checkpoint else None
        items.append(
            TrainingRunItem(
                id=r.id,
                status=r.status,
                base_checkpoint=r.base_checkpoint,
                candidate_checkpoint_id=r.candidate_checkpoint_id,
                candidate_version_tag=cand_tag,
                candidate_status=cand_status,
                num_samples_used=r.num_samples_used,
                metrics=r.metrics,
                error_message=r.error_message,
                started_at=r.started_at,
                completed_at=r.completed_at,
            )
        )
    return items


@router.get(
    "/runs/{run_id}/evaluation",
    response_model=EvaluationResponse,
    summary="Get Candidate Evaluation & Promotion Recommendation",
    description="Compares candidate checkpoint against production baseline on benchmark and hard cases.",
)
def get_run_evaluation(
    run_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(require_reviewer_or_above),
) -> EvaluationResponse:
    """Retrieve detailed evaluation metrics and promotion recommendation."""
    stmt = select(TrainingRun).where(TrainingRun.id == run_id)
    run = db.execute(stmt).scalar_one_or_none()
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Training run ID {run_id} not found",
        )

    if not run.candidate_checkpoint:
        return EvaluationResponse(
            run_id=run.id,
            candidate_checkpoint_id=None,
            candidate_version_tag=None,
            available=False,
            recommend_promotion=False,
            reasons=["No candidate checkpoint associated with this training run."],
        )

    prod = promotion_service.get_active_production_checkpoint(db)
    cand = run.candidate_checkpoint

    eligibility = promotion_service.check_promotion_eligibility(cand, prod)

    return EvaluationResponse(
        run_id=run.id,
        candidate_checkpoint_id=cand.id,
        candidate_version_tag=cand.version_tag,
        available=eligibility.get("available", False),
        metrics=cand.evaluation_metrics,
        recommend_promotion=eligibility.get("recommend_promotion", False),
        has_improvement=eligibility.get("has_improvement", False),
        has_regression=eligibility.get("has_regression", False),
        reasons=eligibility.get("reasons", []),
    )


@router.post(
    "/runs/{run_id}/promote",
    response_model=PromotionResponse,
    summary="Promote Candidate Checkpoint (ADMIN Only)",
    description="Promote evaluated candidate to active production checkpoint if no regression is present.",
)
def promote_candidate_run(
    run_id: int,
    force: bool = Query(default=False, description="Force promotion bypassing evaluation check"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(require_admin),
) -> PromotionResponse:
    """Promote candidate checkpoint to production."""
    stmt = select(TrainingRun).where(TrainingRun.id == run_id)
    run = db.execute(stmt).scalar_one_or_none()
    if not run or not run.candidate_checkpoint_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Training run #{run_id} has no candidate checkpoint to promote.",
        )

    user_id = current_user.id if current_user else 1

    try:
        promoted_cp = promotion_service.promote_candidate(
            candidate_id=run.candidate_checkpoint_id,
            user_id=user_id,
            db=db,
            force=force,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    return PromotionResponse(
        success=True,
        message=f"Candidate {promoted_cp.version_tag} promoted to active PRODUCTION checkpoint.",
        checkpoint_id=promoted_cp.id,
        version_tag=promoted_cp.version_tag,
        status=promoted_cp.status,
        promoted_at=promoted_cp.promoted_at,
    )


@router.post(
    "/runs/{run_id}/reject",
    response_model=PromotionResponse,
    summary="Reject Candidate Checkpoint (ADMIN Only)",
    description="Explicitly reject candidate checkpoint due to poor accuracy or regression.",
)
def reject_candidate_run(
    run_id: int,
    reason: Optional[str] = Query(default="REJECTED_BY_ADMIN", description="Reason for rejection"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(require_admin),
) -> PromotionResponse:
    """Reject candidate checkpoint."""
    stmt = select(TrainingRun).where(TrainingRun.id == run_id)
    run = db.execute(stmt).scalar_one_or_none()
    if not run or not run.candidate_checkpoint_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Training run #{run_id} has no candidate checkpoint.",
        )

    try:
        rejected_cp = promotion_service.reject_candidate(
            candidate_id=run.candidate_checkpoint_id,
            db=db,
            reason=reason,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    return PromotionResponse(
        success=True,
        message=f"Candidate {rejected_cp.version_tag} marked as REJECTED.",
        checkpoint_id=rejected_cp.id,
        version_tag=rejected_cp.version_tag,
        status=rejected_cp.status,
        promoted_at=rejected_cp.promoted_at,
    )


@router.post(
    "/checkpoints/{checkpoint_id}/rollback",
    response_model=PromotionResponse,
    summary="Rollback Production Checkpoint (ADMIN Only)",
    description="Revert active production status to an earlier or archived checkpoint.",
)
def rollback_production_checkpoint(
    checkpoint_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(require_admin),
) -> PromotionResponse:
    """Rollback production model to an earlier checkpoint."""
    user_id = current_user.id if current_user else 1

    try:
        target_cp = promotion_service.rollback_to(
            target_checkpoint_id=checkpoint_id,
            user_id=user_id,
            db=db,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    return PromotionResponse(
        success=True,
        message=f"Production checkpoint successfully rolled back to {target_cp.version_tag}.",
        checkpoint_id=target_cp.id,
        version_tag=target_cp.version_tag,
        status=target_cp.status,
        promoted_at=target_cp.promoted_at,
    )
