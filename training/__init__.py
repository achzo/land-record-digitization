"""Kannada Handwriting TrOCR Baseline Training & Evaluation Infrastructure."""

from training.dataset import (
    KannadaSample,
    parse_manifest_file,
    combine_datasets,
    ManifestValidationError,
)
from training.collator import TrOCRDataCollator
from training.validate_kannada_tokenizer import (
    validate_tokenizer_instance,
    evaluate_text_preservation,
    KANNADA_TEST_SUITE,
)

__all__ = [
    "KannadaSample",
    "parse_manifest_file",
    "combine_datasets",
    "ManifestValidationError",
    "TrOCRDataCollator",
    "validate_tokenizer_instance",
    "evaluate_text_preservation",
    "KANNADA_TEST_SUITE",
]
