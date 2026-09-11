from dataclasses import dataclass
from typing import List, Dict, Any, Optional

try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False


@dataclass
class TrOCRDataCollator:
    """Data collator for TrOCR VisionEncoderDecoderModel.

    Handles:
    - Stacking preprocessed pixel_values across the batch into a single 4D Tensor (B, C, H, W).
    - Stacking label sequences into a 2D Tensor (B, SeqLen).
    - Guaranteeing that padding token IDs are replaced with -100 so CrossEntropyLoss ignores them.
    """
    processor: Optional[Any] = None
    pad_token_id: Optional[int] = None

    def __post_init__(self):
        if self.processor and hasattr(self.processor, "tokenizer") and self.processor.tokenizer:
            if self.pad_token_id is None:
                self.pad_token_id = self.processor.tokenizer.pad_token_id

    def __call__(self, batch: List[Dict[str, Any]]) -> Dict[str, Any]:
        if not TORCH_AVAILABLE:
            raise ImportError(
                "PyTorch is required for TrOCRDataCollator. "
                "Install with: pip install -r training/requirements-train.txt"
            )

        # 1. Collate pixel_values
        pixel_values = [item["pixel_values"] for item in batch if "pixel_values" in item]
        if pixel_values:
            batch_pixels = torch.stack(pixel_values)
        else:
            batch_pixels = None

        # 2. Collate labels
        batch_labels = []
        for item in batch:
            if "labels" in item:
                lbl = item["labels"]
                if not isinstance(lbl, torch.Tensor):
                    lbl = torch.tensor(lbl, dtype=torch.long)
                if self.pad_token_id is not None:
                    lbl = torch.where(lbl == self.pad_token_id, torch.tensor(-100, dtype=torch.long), lbl)
                batch_labels.append(lbl)

        if batch_labels:
            collated_labels = torch.stack(batch_labels)
        else:
            collated_labels = None

        result = {}
        if batch_pixels is not None:
            result["pixel_values"] = batch_pixels
        if collated_labels is not None:
            result["labels"] = collated_labels

        return result
