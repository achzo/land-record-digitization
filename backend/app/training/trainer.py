import abc
import os
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.models.active_learning import ActiveLearningSample
from app.models.model_registry import ModelCheckpoint, TrainingRun
from app.core.al_config import active_learning_config


class BaseKannadaTrainer(abc.ABC):
    """Abstract contract for Kannada Handwriting TrOCR training systems."""

    @abc.abstractmethod
    def prepare_training_dataset(
        self,
        verified_samples: List[ActiveLearningSample],
    ) -> Dict[str, Any]:
        """Format verified human samples for fine-tuning without polluting base datasets."""
        pass

    @abc.abstractmethod
    def execute_training_run(
        self,
        run_id: int,
        base_checkpoint_path: str,
        output_candidate_path: str,
        training_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Execute fine-tuning to create candidate checkpoint.

        MUST NOT touch production checkpoint.
        """
        pass


class KannadaTrOCRTrainingAdapter(BaseKannadaTrainer):
    """Clean interface/adapter connecting active-learning verified samples to training infrastructure.

    CRITICAL SAFETY RULES:
    1. Base production checkpoint is loaded strictly READ-ONLY.
    2. Candidate checkpoints are saved to isolated candidate directories: checkpoints/candidate_{run_id}/.
    3. Production checkpoint is NEVER modified or overwritten during training.
    4. Real retraining is not executed until an authorized training environment with GPU/dataset is attached.
    """

    def __init__(self, checkpoints_base_dir: Optional[Path] = None):
        self.checkpoints_dir = checkpoints_base_dir or Path("checkpoints")
        self.candidates_dir = self.checkpoints_dir / "candidates"
        self.candidates_dir.mkdir(parents=True, exist_ok=True)

    def prepare_training_dataset(
        self,
        verified_samples: List[ActiveLearningSample],
    ) -> Dict[str, Any]:
        """Extract verified human ground-truth labels and crop references."""
        train_items = []
        val_items = []
        for s in verified_samples:
            item = {
                "sample_id": s.id,
                "crop_path": s.crop_image_path,
                "ground_truth_text": s.verified_text,  # STRICTLY verified human label
                "confidence": s.confidence_score,
                "split": s.split,
            }
            if s.split == "VAL":
                val_items.append(item)
            else:
                train_items.append(item)

        return {
            "total_samples": len(verified_samples),
            "train_count": len(train_items),
            "val_count": len(val_items),
            "train_samples": train_items,
            "val_samples": val_items,
        }

    def execute_training_run(
        self,
        run_id: int,
        base_checkpoint_path: str,
        output_candidate_path: str,
        training_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Simulate or execute candidate preparation without modifying production weights.

        When real PyTorch training scripts are attached, this initiates the candidate fine-tuning loop.
        """
        candidate_path = Path(output_candidate_path)
        candidate_path.mkdir(parents=True, exist_ok=True)

        manifest = {
            "run_id": run_id,
            "base_checkpoint": base_checkpoint_path,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "samples_used": training_data["total_samples"],
            "status": "CANDIDATE",
            "candidate_dir": str(candidate_path),
            "training_adapter": "KannadaTrOCRTrainingAdapter",
            "note": "Candidate checkpoint isolated from production weights.",
        }

        with open(candidate_path / "candidate_manifest.json", "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2)

        return manifest


kannada_training_adapter = KannadaTrOCRTrainingAdapter()
