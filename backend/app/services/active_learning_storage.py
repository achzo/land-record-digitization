import os
import json
import hashlib
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Dict, Any, List


class ActiveLearningStorageManager:
    """Manages active-learning sample filesystem storage under training/active_learning/

    Directories:
        pending/  : unverified low-confidence samples
        verified/ : human-confirmed ground truth datasets
        rejected/ : samples marked unusable / invalid
        metadata/ : global indices and tracking
    """

    def __init__(self, base_dir: Optional[Path] = None):
        if base_dir:
            self.base_dir = Path(base_dir)
        else:
            # Check relative to backend or repo root
            candidates = [
                Path("training/active_learning"),
                Path("../training/active_learning"),
                Path(__file__).resolve().parent.parent.parent.parent / "training" / "active_learning",
                Path(__file__).resolve().parent.parent.parent / "training" / "active_learning",
            ]
            self.base_dir = next((c for c in candidates if c.parent.is_dir()), Path("training/active_learning"))

        self.pending_dir = self.base_dir / "pending"
        self.verified_dir = self.base_dir / "verified"
        self.rejected_dir = self.base_dir / "rejected"
        self.metadata_dir = self.base_dir / "metadata"

        self.pending_crops_dir = self.pending_dir / "crops"
        self.verified_crops_dir = self.verified_dir / "crops"

        # Ensure directories exist
        for d in [self.pending_crops_dir, self.verified_crops_dir, self.rejected_dir, self.metadata_dir]:
            d.mkdir(parents=True, exist_ok=True)

        self._index_file = self.metadata_dir / "image_hash_index.json"
        self._load_hash_index()

    def _load_hash_index(self):
        if self._index_file.is_file():
            try:
                with open(self._index_file, "r", encoding="utf-8") as f:
                    self.hash_index = json.load(f)
            except Exception:
                self.hash_index = {}
        else:
            self.hash_index = {}

    def _save_hash_index(self):
        try:
            with open(self._index_file, "w", encoding="utf-8") as f:
                json.dump(self.hash_index, f, indent=2)
        except Exception:
            pass

    @staticmethod
    def compute_image_hash(image_bytes: bytes) -> str:
        """Calculate SHA-256 checksum of raw image bytes."""
        return hashlib.sha256(image_bytes).hexdigest()

    def is_duplicate_image(self, image_hash: str) -> bool:
        """Check if an identical crop image was already ingested or verified."""
        return image_hash in self.hash_index

    def is_duplicate_sample(self, image_hash: str, text: str) -> bool:
        """Check if identical (image_hash, text) exists in verified index."""
        existing = self.hash_index.get(image_hash)
        if existing and existing.get("verified_text") == text.strip():
            return True
        return False

    def save_pending_sample(
        self,
        sample_id: str,
        document_id: int,
        field_id: int,
        image_bytes: Optional[bytes],
        original_ocr_prediction: str,
        beam_candidates: Optional[List[Dict[str, Any]]],
        confidence: float,
        model_version: str = "kannada-trocr-prod-v1.0",
        preprocessing_version: str = "person-a-v1.0",
    ) -> Dict[str, Any]:
        """Save low-confidence OCR output to pending/ for human review.

        DOES NOT store OCR prediction as a verified label.
        """
        crop_rel_path = None
        image_hash = None
        if image_bytes:
            image_hash = self.compute_image_hash(image_bytes)
            crop_filename = f"{sample_id}.png"
            crop_file = self.pending_crops_dir / crop_filename
            with open(crop_file, "wb") as f:
                f.write(image_bytes)
            crop_rel_path = str(crop_file.relative_to(self.base_dir)).replace("\\", "/")

        payload = {
            "sample_id": sample_id,
            "document_id": document_id,
            "field_id": field_id,
            "crop_image_path": crop_rel_path,
            "image_hash": image_hash,
            "original_ocr_prediction": original_ocr_prediction,
            "beam_candidates": beam_candidates or [],
            "confidence": round(float(confidence), 4),
            "model_version": model_version,
            "preprocessing_version": preprocessing_version,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "status": "PENDING_REVIEW",
        }

        meta_file = self.pending_dir / f"{sample_id}.json"
        with open(meta_file, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2, ensure_ascii=False)

        if image_hash:
            self.hash_index[image_hash] = {
                "sample_id": sample_id,
                "status": "PENDING_REVIEW",
                "verified_text": None,
            }
            self._save_hash_index()

        return payload

    def mark_verified_sample(
        self,
        sample_id: str,
        verified_text: str,
        reviewer_id: int,
        split: str = "TRAIN",
    ) -> Dict[str, Any]:
        """Promote a human-verified item into verified/ ground truth dataset."""
        meta_file = self.pending_dir / f"{sample_id}.json"
        payload = {}
        if meta_file.is_file():
            with open(meta_file, "r", encoding="utf-8") as f:
                payload = json.load(f)

        # Move/copy crop image to verified_crops
        pending_crop = self.pending_crops_dir / f"{sample_id}.png"
        verified_crop_rel = None
        if pending_crop.is_file():
            verified_crop = self.verified_crops_dir / f"{sample_id}.png"
            verified_crop.write_bytes(pending_crop.read_bytes())
            verified_crop_rel = str(verified_crop.relative_to(self.base_dir)).replace("\\", "/")

        payload.update({
            "sample_id": sample_id,
            "status": "VERIFIED",
            "verified_text": verified_text,
            "verified_by_human": True,
            "reviewer_id": reviewer_id,
            "verified_at": datetime.now(timezone.utc).isoformat(),
            "split": split,
            "verified_crop_path": verified_crop_rel,
        })

        out_file = self.verified_dir / f"{sample_id}.json"
        with open(out_file, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2, ensure_ascii=False)

        # Update index
        img_hash = payload.get("image_hash")
        if img_hash:
            self.hash_index[img_hash] = {
                "sample_id": sample_id,
                "status": "VERIFIED",
                "verified_text": verified_text,
            }
            self._save_hash_index()

        # Update pending file
        if meta_file.is_file():
            payload["status"] = "VERIFIED"
            with open(meta_file, "w", encoding="utf-8") as f:
                json.dump(payload, f, indent=2, ensure_ascii=False)

        return payload

    def mark_rejected_sample(
        self,
        sample_id: str,
        reviewer_id: int,
        reason: str = "REJECTED_BY_HUMAN",
    ) -> Dict[str, Any]:
        """Store rejection metadata. Never produces training data."""
        meta_file = self.pending_dir / f"{sample_id}.json"
        payload = {}
        if meta_file.is_file():
            with open(meta_file, "r", encoding="utf-8") as f:
                payload = json.load(f)

        payload.update({
            "sample_id": sample_id,
            "status": "REJECTED",
            "rejected_by_reviewer_id": reviewer_id,
            "rejected_at": datetime.now(timezone.utc).isoformat(),
            "rejection_reason": reason,
        })

        out_file = self.rejected_dir / f"{sample_id}.json"
        with open(out_file, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2, ensure_ascii=False)

        img_hash = payload.get("image_hash")
        if img_hash:
            self.hash_index[img_hash] = {
                "sample_id": sample_id,
                "status": "REJECTED",
                "verified_text": None,
            }
            self._save_hash_index()

        if meta_file.is_file():
            with open(meta_file, "w", encoding="utf-8") as f:
                json.dump(payload, f, indent=2, ensure_ascii=False)

        return payload


al_storage_manager = ActiveLearningStorageManager()
