from enum import Enum
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, field_validator, ConfigDict


class ReviewDecisionAction(str, Enum):
    ACCEPT = "ACCEPT"
    CORRECT = "CORRECT"
    REJECT = "REJECT"


class ReviewDecisionRequest(BaseModel):
    action: ReviewDecisionAction = Field(..., description="ACCEPT, CORRECT, or REJECT")
    corrected_text: Optional[str] = Field(default=None, description="Explicit text correction entered by reviewer")
    selected_candidate_index: Optional[int] = Field(default=None, description="0-indexed candidate picked by reviewer")
    rejection_reason: Optional[str] = Field(default=None, description="Optional explanation when rejecting")

    @field_validator("corrected_text")
    @classmethod
    def validate_corrected_text(cls, v: Optional[str], info) -> Optional[str]:
        if v is not None:
            stripped = v.strip()
            if not stripped:
                raise ValueError("Corrected text cannot be empty or solely whitespace.")
            return stripped
        return v


class ReviewQueueItem(BaseModel):
    field_id: int
    document_id: int
    field_name: str
    original_value: Optional[str]
    confidence_score: float
    review_status: str
    candidates: Optional[List[Dict[str, Any]]] = None
    crop_image_path: Optional[str] = None
    source_page: int = 1
    bounding_box: Optional[Dict[str, Any]] = None
    language_script: Optional[str] = "kannada_handwritten"
    model_version: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReviewQueueResponse(BaseModel):
    total_pending: int
    items: List[ReviewQueueItem]


class ReviewDecisionResponse(BaseModel):
    success: bool
    message: str
    field_id: int
    action: str
    review_status: str
    verified_sample_created: bool
    sample_id: Optional[int] = None
    verified_text: Optional[str] = None


class ReviewStatsResponse(BaseModel):
    pending_count: int
    verified_count: int
    rejected_count: int
    training_threshold: int
    ready_for_training: bool
