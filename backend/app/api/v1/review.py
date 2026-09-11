from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, func, and_

from app.api.deps import get_db, require_reviewer_or_above
from app.models.user import User
from app.models.extracted_field import ExtractedField
from app.models.active_learning import ActiveLearningSample
from app.schemas.review import (
    ReviewDecisionRequest,
    ReviewDecisionResponse,
    ReviewQueueResponse,
    ReviewQueueItem,
    ReviewStatsResponse,
    ReviewDecisionAction,
)
from app.services.active_learning_storage import al_storage_manager
from app.core.al_config import active_learning_config

router = APIRouter()


@router.get(
    "/queue",
    response_model=ReviewQueueResponse,
    summary="Get Review Queue",
    description="List all fields pending human verification, ordered by lowest confidence first.",
)
def get_review_queue(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    language_script: Optional[str] = Query(default=None, description="Filter by script type, e.g. kannada_handwritten"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(require_reviewer_or_above),
) -> ReviewQueueResponse:
    """Retrieve queue of uncertain fields needing human review."""
    query = select(ExtractedField).where(ExtractedField.review_status == "PENDING_REVIEW")
    if language_script:
        query = query.where(ExtractedField.language_script == language_script)

    count_stmt = select(func.count()).select_from(query.subquery())
    total_pending = db.execute(count_stmt).scalar_one()

    # Order by confidence ascending (most uncertain first)
    paged_query = query.order_by(ExtractedField.confidence_score.asc(), ExtractedField.id.asc()).offset(skip).limit(limit)
    fields = db.execute(paged_query).scalars().all()

    items = [
        ReviewQueueItem(
            field_id=f.id,
            document_id=f.document_id,
            field_name=f.field_name,
            original_value=f.original_value,
            confidence_score=f.confidence_score,
            review_status=f.review_status,
            candidates=f.candidates,
            crop_image_path=f.crop_image_path,
            source_page=f.source_page,
            bounding_box=f.bounding_box,
            language_script=f.language_script,
            model_version=f.model_version,
            created_at=f.created_at,
        )
        for f in fields
    ]

    return ReviewQueueResponse(total_pending=total_pending, items=items)


@router.post(
    "/{field_id}/decision",
    response_model=ReviewDecisionResponse,
    summary="Submit Human Review Decision",
    description="Explicitly accept, correct, or reject a field transcription. Only human-verified items enter training dataset.",
)
def submit_review_decision(
    field_id: int,
    decision: ReviewDecisionRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(require_reviewer_or_above),
) -> ReviewDecisionResponse:
    """Process reviewer verification action (ACCEPT, CORRECT, or REJECT)."""
    stmt = select(ExtractedField).where(ExtractedField.id == field_id)
    field = db.execute(stmt).scalar_one_or_none()
    if not field:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Field with ID {field_id} not found",
        )

    user_id = current_user.id if current_user else 1

    # =========================================================================
    # REJECT ACTION: Never creates training sample
    # =========================================================================
    if decision.action == ReviewDecisionAction.REJECT:
        field.review_status = "REJECTED"
        db.commit()
        db.refresh(field)

        sample_id = f"doc_{field.document_id}_field_{field.id}"
        al_storage_manager.mark_rejected_sample(
            sample_id=sample_id,
            reviewer_id=user_id,
            reason=decision.rejection_reason or "REJECTED_BY_HUMAN",
        )

        return ReviewDecisionResponse(
            success=True,
            message="Field successfully rejected. No training sample created.",
            field_id=field.id,
            action="REJECT",
            review_status="REJECTED",
            verified_sample_created=False,
        )

    # =========================================================================
    # ACCEPT / CORRECT ACTIONS: Must yield valid non-empty verified_text
    # =========================================================================
    verified_text: Optional[str] = None
    new_status = "VERIFIED"

    if decision.action == ReviewDecisionAction.ACCEPT:
        # If candidate index specified, pick that candidate explicitly
        if decision.selected_candidate_index is not None:
            cands = field.candidates or []
            if 0 <= decision.selected_candidate_index < len(cands):
                cand = cands[decision.selected_candidate_index]
                verified_text = cand.get("text") if isinstance(cand, dict) else str(cand)
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Selected candidate index {decision.selected_candidate_index} is out of bounds.",
                )
        else:
            verified_text = field.original_value

        if not verified_text or not verified_text.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot ACCEPT an empty OCR prediction. Please enter a correction instead.",
            )
        verified_text = verified_text.strip()
        new_status = "VERIFIED"

    elif decision.action == ReviewDecisionAction.CORRECT:
        if not decision.corrected_text or not decision.corrected_text.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Corrected text cannot be empty or solely whitespace.",
            )
        verified_text = decision.corrected_text.strip()
        new_status = "EDITED"

    # =========================================================================
    # DUPLICATE CHECKS: Check image hash and image+text duplicates
    # =========================================================================
    image_hash = None
    sample_id = f"doc_{field.document_id}_field_{field.id}"
    
    # Check if this field already has an active learning sample
    existing_sample_stmt = select(ActiveLearningSample).where(
        ActiveLearningSample.extracted_field_id == field.id
    )
    existing_sample = db.execute(existing_sample_stmt).scalar_one_or_none()
    if existing_sample:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Field ID {field.id} already has a verified active learning sample.",
        )

    # Check for duplicate image crop or duplicate sample in DB
    if field.crop_image_path:
        # If crop path is known, generate or read hash
        image_hash = al_storage_manager.compute_image_hash(field.crop_image_path.encode("utf-8"))

        # Duplicate image check
        dup_img_stmt = select(ActiveLearningSample).where(
            and_(
                ActiveLearningSample.image_hash == image_hash,
                ActiveLearningSample.extracted_field_id != field.id,
            )
        )
        dup_img = db.execute(dup_img_stmt).scalar_one_or_none()
        if dup_img:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Duplicate image rejected: identical crop image already verified in active learning dataset.",
            )

    # Duplicate image + text check
    if image_hash:
        dup_text_stmt = select(ActiveLearningSample).where(
            and_(
                ActiveLearningSample.image_hash == image_hash,
                ActiveLearningSample.verified_text == verified_text,
            )
        )
        dup_text = db.execute(dup_text_stmt).scalar_one_or_none()
        if dup_text:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Duplicate rejected: identical crop image and text transcription already exists.",
            )

    # Update ExtractedField
    field.review_status = new_status
    field.normalized_value = verified_text
    db.commit()
    db.refresh(field)

    # Determine train/val split based on configured validation_split
    val_split = active_learning_config.validation_split
    total_verified = db.execute(select(func.count(ActiveLearningSample.id))).scalar_one()
    # E.g. every 1/val_split sample goes to VAL, rest to TRAIN
    split = "VAL" if (val_split > 0 and (total_verified + 1) % int(1.0 / val_split) == 0) else "TRAIN"

    # Create ActiveLearningSample
    al_sample = ActiveLearningSample(
        extracted_field_id=field.id,
        document_id=field.document_id,
        crop_image_path=field.crop_image_path,
        image_hash=image_hash,
        original_prediction=field.original_value or "",
        verified_text=verified_text,
        verified_by_human=True,
        confidence_score=field.confidence_score,
        language_script=field.language_script or "kannada_handwritten",
        reviewer_id=user_id,
        verified_at=datetime.now(timezone.utc),
        split=split,
    )
    db.add(al_sample)
    db.commit()
    db.refresh(al_sample)

    # Save to verified storage
    al_storage_manager.mark_verified_sample(
        sample_id=sample_id,
        verified_text=verified_text,
        reviewer_id=user_id,
        split=split,
    )

    return ReviewDecisionResponse(
        success=True,
        message="Field confirmed by human reviewer and added to active-learning dataset.",
        field_id=field.id,
        action=decision.action.value,
        review_status=new_status,
        verified_sample_created=True,
        sample_id=al_sample.id,
        verified_text=verified_text,
    )


@router.get(
    "/stats",
    response_model=ReviewStatsResponse,
    summary="Get Review & Verification Statistics",
    description="Returns counts of pending items, verified training samples, and training readiness.",
)
def get_review_stats(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(require_reviewer_or_above),
) -> ReviewStatsResponse:
    """Check pending review queue depth and verified sample accumulation."""
    pending_stmt = select(func.count(ExtractedField.id)).where(ExtractedField.review_status == "PENDING_REVIEW")
    pending_count = db.execute(pending_stmt).scalar_one()

    verified_stmt = select(func.count(ActiveLearningSample.id)).where(ActiveLearningSample.verified_by_human == True)
    verified_count = db.execute(verified_stmt).scalar_one()

    rejected_stmt = select(func.count(ExtractedField.id)).where(ExtractedField.review_status == "REJECTED")
    rejected_count = db.execute(rejected_stmt).scalar_one()

    threshold = active_learning_config.min_verified_samples_for_training
    ready = verified_count >= threshold

    return ReviewStatsResponse(
        pending_count=pending_count,
        verified_count=verified_count,
        rejected_count=rejected_count,
        training_threshold=threshold,
        ready_for_training=ready,
    )
