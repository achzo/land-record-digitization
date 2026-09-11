import os
import json
import logging
import unicodedata
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Dict, Any, Optional, Union, Tuple, Set

logger = logging.getLogger(__name__)


@dataclass
class KannadaSample:
    """Standardized internal representation of a Kannada handwriting training sample."""
    image_path: str
    text: str
    source: str = "baseline"
    verified_by_human: bool = True
    model_version: Optional[str] = None
    confidence: Optional[float] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        # Normalize Unicode string to Canonical Decomposition followed by Canonical Composition (NFC)
        if self.text is not None:
            self.text = unicodedata.normalize("NFC", str(self.text).strip())


class ManifestValidationError(ValueError):
    """Raised when a dataset manifest contains invalid or malformed data."""
    pass


def parse_manifest_file(
    manifest_path: Union[str, Path],
    dataset_root: Union[str, Path] = "",
    strict_human_verified_only: bool = True,
    allow_missing_images: bool = False,
) -> List[KannadaSample]:
    """Parse a dataset manifest file (.json or .jsonl) containing Kannada handwriting samples.

    Safety Rules:
    1. Rejects samples where source == 'active_learning' and verified_by_human != True.
    2. Rejects samples with empty or whitespace-only transcriptions.
    3. Normalizes Kannada Unicode text to NFC format to prevent multi-codepoint divergence.
    4. Deduplicates identical (image_path, text) pairs.
    """
    path = Path(manifest_path)
    if not path.exists():
        raise FileNotFoundError(f"Dataset manifest file not found: {path}")

    root = Path(dataset_root) if dataset_root else Path("")
    raw_records: List[Dict[str, Any]] = []

    # 1. Read JSON or JSONL format
    if path.suffix.lower() == ".jsonl":
        with open(path, "r", encoding="utf-8") as f:
            for line_idx, line in enumerate(f, 1):
                stripped = line.strip()
                if not stripped:
                    continue
                try:
                    record = json.loads(stripped)
                    raw_records.append(record)
                except json.JSONDecodeError as exc:
                    raise ManifestValidationError(f"Invalid JSON at line {line_idx} in {path}: {exc}")
    else:
        with open(path, "r", encoding="utf-8") as f:
            try:
                data = json.load(f)
                if isinstance(data, list):
                    raw_records = data
                elif isinstance(data, dict) and "samples" in data:
                    raw_records = data["samples"]
                else:
                    raise ManifestValidationError(f"Expected a JSON list of objects or dict with 'samples' in {path}")
            except json.JSONDecodeError as exc:
                raise ManifestValidationError(f"Malformed JSON in {path}: {exc}")

    # 2. Parse, validate, and filter records
    validated_samples: List[KannadaSample] = []
    seen_pairs: Set[Tuple[str, str]] = set()
    rejected_count = 0

    for idx, rec in enumerate(raw_records):
        # Resolve image path key
        img_key = rec.get("image_path") or rec.get("image") or rec.get("crop_path") or rec.get("file_name")
        if not img_key or not str(img_key).strip():
            logger.warning(f"Record #{idx} in {path} missing image path. Skipping.")
            rejected_count += 1
            continue

        resolved_img = str(root / str(img_key).strip()) if root else str(img_key).strip()
        if not allow_missing_images and not Path(resolved_img).exists() and root:
            logger.warning(f"Image not found at {resolved_img}. Skipping.")
            rejected_count += 1
            continue

        # Resolve text transcription
        text_key = rec.get("text") or rec.get("ground_truth_text") or rec.get("transcription") or rec.get("label")
        if text_key is None or not str(text_key).strip():
            logger.warning(f"Record #{idx} in {path} missing transcription text. Skipping.")
            rejected_count += 1
            continue

        normalized_text = unicodedata.normalize("NFC", str(text_key).strip())

        # CRITICAL SAFETY CHECK: Human verification requirement
        source = rec.get("source", "baseline")
        is_verified = rec.get("verified_by_human", True if source != "active_learning" else False)

        if strict_human_verified_only:
            if source == "active_learning" and not is_verified:
                logger.debug(f"Rejecting unverified active-learning sample: {resolved_img}")
                rejected_count += 1
                continue
            if rec.get("verified_by_human") is False:
                logger.debug(f"Rejecting sample explicitly flagged as unverified: {resolved_img}")
                rejected_count += 1
                continue

        # Deduplication check
        pair_key = (resolved_img, normalized_text)
        if pair_key in seen_pairs:
            logger.debug(f"Duplicate sample detected and skipped: {resolved_img}")
            rejected_count += 1
            continue
        seen_pairs.add(pair_key)

        sample = KannadaSample(
            image_path=resolved_img,
            text=normalized_text,
            source=source,
            verified_by_human=bool(is_verified),
            model_version=rec.get("model_version"),
            confidence=rec.get("confidence"),
            metadata=rec.get("metadata", {}),
        )
        validated_samples.append(sample)

    logger.info(
        f"Loaded {len(validated_samples)} valid Kannada samples from {path} ({rejected_count} rejected/duplicate)."
    )
    return validated_samples


def combine_datasets(
    baseline_samples: List[KannadaSample],
    active_learning_samples: List[KannadaSample],
    deduplicate: bool = True,
) -> List[KannadaSample]:
    """Combine original baseline dataset with human-verified active learning samples.

    Prevents catastrophic forgetting by preserving baseline representation.
    """
    combined: List[KannadaSample] = list(baseline_samples)
    seen_images = {s.image_path for s in baseline_samples}

    for s in active_learning_samples:
        if not s.verified_by_human:
            continue
        if deduplicate and s.image_path in seen_images:
            continue
        combined.append(s)
        seen_images.add(s.image_path)

    return combined


# Optional PyTorch Dataset Implementation
try:
    from torch.utils.data import Dataset
    import torch
    from PIL import Image

    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    Dataset = object  # type: ignore


class KannadaOCRDataset(Dataset):
    """PyTorch Dataset for Kannada Handwriting TrOCR training."""

    def __init__(
        self,
        samples: List[KannadaSample],
        processor: Any = None,
        max_target_length: int = 64,
    ):
        if not TORCH_AVAILABLE:
            raise ImportError(
                "PyTorch and PIL are required to instantiate KannadaOCRDataset. "
                "Install with: pip install -r training/requirements-train.txt"
            )
        self.samples = samples
        self.processor = processor
        self.max_target_length = max_target_length

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int) -> Dict[str, Any]:
        sample = self.samples[idx]

        # Load image via PIL
        image = Image.open(sample.image_path).convert("RGB")

        if self.processor is not None:
            # Generate pixel_values
            pixel_values = self.processor(image, return_tensors="pt").pixel_values.squeeze(0)

            # Generate token labels
            labels = self.processor.tokenizer(
                sample.text,
                padding="max_length",
                max_length=self.max_target_length,
                truncation=True,
                return_tensors="pt",
            ).input_ids.squeeze(0)

            # Replace padding token id's of the labels by -100 so it's ignored by PyTorch loss
            pad_token_id = self.processor.tokenizer.pad_token_id
            labels = [label if label != pad_token_id else -100 for label in labels]
            labels = torch.tensor(labels, dtype=torch.long)

            return {
                "pixel_values": pixel_values,
                "labels": labels,
                "text": sample.text,
                "image_path": sample.image_path,
            }

        return {
            "image": image,
            "text": sample.text,
            "image_path": sample.image_path,
        }
