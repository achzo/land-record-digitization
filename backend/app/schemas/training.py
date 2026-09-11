from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class TrainingStatusResponse(BaseModel):
    active_learning_enabled: bool
    current_production_checkpoint: str
    production_checkpoint_path: str
    verified_samples_count: int
    min_verified_samples_for_training: int
    ready_to_train: bool
    active_training_run: Optional[Dict[str, Any]] = None
    total_training_runs: int


class TrainingTriggerRequest(BaseModel):
    notes: Optional[str] = Field(default=None, description="Optional annotations for this training trigger")


class TrainingTriggerResponse(BaseModel):
    success: bool
    message: str
    training_run_id: int
    status: str
    samples_used: int


class TrainingRunItem(BaseModel):
    id: int
    status: str
    base_checkpoint: str
    candidate_checkpoint_id: Optional[int] = None
    candidate_version_tag: Optional[str] = None
    candidate_status: Optional[str] = None
    num_samples_used: int
    metrics: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    started_at: datetime
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class EvaluationResponse(BaseModel):
    run_id: int
    candidate_checkpoint_id: Optional[int]
    candidate_version_tag: Optional[str]
    available: bool
    metrics: Optional[Dict[str, Any]] = None
    recommend_promotion: bool
    has_improvement: bool = False
    has_regression: bool = False
    reasons: List[str] = []


class PromotionResponse(BaseModel):
    success: bool
    message: str
    checkpoint_id: int
    version_tag: str
    status: str
    promoted_at: Optional[datetime] = None
