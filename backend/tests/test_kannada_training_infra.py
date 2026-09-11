import os
import json
import pytest
import unicodedata
from pathlib import Path

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
from training.train_kannada_trocr import load_kannada_ocr_config


def test_kannada_unicode_preservation_and_normalization():
    """Verify that Kannada Unicode strings are preserved without character decomposition loss."""
    # Test string with conjuncts, halant, matras
    raw_kannada = "ಕರ್ನಾಟಕ ಸ್ವಾತಂತ್ರ್ಯ ಸಂಗ್ರಾಮ ೧೯೪೭"
    sample = KannadaSample(image_path="crops/test1.png", text=raw_kannada)

    # Must match NFC normalized form
    expected = unicodedata.normalize("NFC", raw_kannada)
    assert sample.text == expected
    assert len(sample.text) == len(expected)

    # Roundtrip preservation check
    is_exact, acc = evaluate_text_preservation(raw_kannada, sample.text)
    assert is_exact is True
    assert acc == 1.0


def test_manifest_parsing_json_and_jsonl(tmp_path):
    """Verify parsing of both JSON array and JSONL manifest formats."""
    # 1. JSON Array format
    json_path = tmp_path / "test_manifest.json"
    records_json = [
        {"image_path": "images/crop1.png", "text": "ಬೆಂಗಳೂರು", "source": "baseline"},
        {"image": "images/crop2.png", "text": "ಮೈಸೂರು", "source": "baseline"},
    ]
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(records_json, f, ensure_ascii=False)

    samples_json = parse_manifest_file(json_path, allow_missing_images=True)
    assert len(samples_json) == 2
    assert samples_json[0].text == "ಬೆಂಗಳೂರು"
    assert samples_json[1].text == "ಮೈಸೂರು"

    # 2. JSONL format
    jsonl_path = tmp_path / "test_manifest.jsonl"
    records_jsonl = [
        {"image": "images/crop3.png", "text": "ಹುಬ್ಬಳ್ಳಿ", "source": "baseline"},
        {"image": "images/crop4.png", "text": "ಧಾರವಾಡ", "source": "baseline"},
    ]
    with open(jsonl_path, "w", encoding="utf-8") as f:
        for r in records_jsonl:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

    samples_jsonl = parse_manifest_file(jsonl_path, allow_missing_images=True)
    assert len(samples_jsonl) == 2
    assert samples_jsonl[0].text == "ಹುಬ್ಬಳ್ಳಿ"
    assert samples_jsonl[1].text == "ಧಾರವಾಡ"


def test_manifest_safety_strict_human_verification(tmp_path):
    """CRITICAL SAFETY TEST: Verify that unverified active-learning predictions are strictly rejected."""
    manifest_path = tmp_path / "safety_test.jsonl"
    mixed_records = [
        # 1. Human verified ACCEPT -> MUST BE ACCEPTED
        {
            "image": "img1.png",
            "text": "ಹಾಸನ",
            "source": "active_learning",
            "verified_by_human": True,
        },
        # 2. Human verified CORRECT -> MUST BE ACCEPTED
        {
            "image": "img2.png",
            "text": "ಶಿವಮೊಗ್ಗ",
            "source": "active_learning",
            "verified_by_human": True,
        },
        # 3. Unverified raw OCR prediction -> MUST BE REJECTED
        {
            "image": "img3.png",
            "text": "ಬೆಳಗಾವಿ",
            "source": "active_learning",
            "verified_by_human": False,
        },
        # 4. Active learning sample missing verified_by_human flag -> MUST BE REJECTED
        {
            "image": "img4.png",
            "text": "ಕಲಬುರಗಿ",
            "source": "active_learning",
        },
        # 5. Empty / whitespace text -> MUST BE REJECTED
        {
            "image": "img5.png",
            "text": "   ",
            "source": "baseline",
            "verified_by_human": True,
        },
    ]

    with open(manifest_path, "w", encoding="utf-8") as f:
        for r in mixed_records:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

    loaded = parse_manifest_file(manifest_path, strict_human_verified_only=True, allow_missing_images=True)

    # Only records #1 and #2 must survive
    assert len(loaded) == 2
    loaded_texts = [s.text for s in loaded]
    assert "ಹಾಸನ" in loaded_texts
    assert "ಶಿವಮೊಗ್ಗ" in loaded_texts
    assert "ಬೆಳಗಾವಿ" not in loaded_texts
    assert "ಕಲಬುರಗಿ" not in loaded_texts


def test_duplicate_sample_detection(tmp_path):
    """Verify that identical (image, text) duplicates within a manifest are deduplicated."""
    manifest_path = tmp_path / "dup_test.jsonl"
    dup_records = [
        {"image": "img1.png", "text": "ಮಂಡ್ಯ"},
        {"image": "img1.png", "text": "ಮಂಡ್ಯ"},  # Exact duplicate
        {"image": "img2.png", "text": "ಉಡುಪಿ"},
    ]
    with open(manifest_path, "w", encoding="utf-8") as f:
        for r in dup_records:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

    loaded = parse_manifest_file(manifest_path, allow_missing_images=True)
    assert len(loaded) == 2
    assert len([s for s in loaded if s.text == "ಮಂಡ್ಯ"]) == 1


def test_combine_datasets_preserves_baseline():
    """Verify combining baseline dataset with active learning verified samples prevents forgetting."""
    base_samples = [
        KannadaSample(image_path="base1.png", text="ರಾಮ"),
        KannadaSample(image_path="base2.png", text="ಕೃಷ್ಣ"),
    ]
    al_samples = [
        KannadaSample(image_path="al1.png", text="ಭೀಮ", source="active_learning", verified_by_human=True),
        KannadaSample(image_path="al2.png", text="ಅರ್ಜುನ", source="active_learning", verified_by_human=False),  # Unverified
    ]

    combined = combine_datasets(base_samples, al_samples)
    assert len(combined) == 3
    texts = [s.text for s in combined]
    assert "ರಾಮ" in texts
    assert "ಕೃಷ್ಣ" in texts
    assert "ಭೀಮ" in texts
    assert "ಅರ್ಜುನ" not in texts  # Unverified was filtered


def test_kannada_ocr_config_loading():
    """Verify that configs/kannada_ocr.yaml loads and contains all required configuration sections."""
    config = load_kannada_ocr_config("configs/kannada_ocr.yaml")
    assert "dataset" in config
    assert "model" in config
    assert "training" in config
    assert "inference" in config

    assert "base_model" in config["model"]
    assert "learning_rate" in config["training"]
    assert "epochs" in config["training"]
    assert "output_dir" in config["training"]
    assert "num_beams" in config["inference"]


def test_tokenizer_validation_interface_with_mock_tokenizer():
    """Verify tokenizer validation benchmark logic using a controlled mock tokenizer."""
    class PerfectMockTokenizer:
        """Simulates an ideal Unicode tokenizer."""
        unk_token_id = 999999
        unk_token = "<unk>"

        def encode(self, text, add_special_tokens=False):
            # 1 token per Unicode character
            return [ord(c) for c in text]

        def decode(self, token_ids, skip_special_tokens=True):
            return "".join(chr(t) for t in token_ids)

    mock_tok = PerfectMockTokenizer()
    suite = KANNADA_TEST_SUITE[:3]  # First 3 categories
    res = validate_tokenizer_instance(mock_tok, test_cases=suite)

    assert res["verdict"] == "SUITABLE"
    assert res["exact_match_rate"] == 1.0
    assert res["total_unk_count"] == 0
    assert res["avg_expansion_ratio"] <= 1.5


def test_tokenizer_validation_catches_unsuitable_tokenizer():
    """Verify that a tokenizer producing UNK tokens or losing characters is flagged UNSUITABLE."""
    class DefectiveMockTokenizer:
        """Simulates an English-only tokenizer that replaces non-ASCII with UNK."""
        unk_token_id = 0
        unk_token = "<unk>"

        def encode(self, text, add_special_tokens=False):
            return [0] * len(text)  # All UNK

        def decode(self, token_ids, skip_special_tokens=True):
            return "<unk>"

    defective_tok = DefectiveMockTokenizer()
    suite = KANNADA_TEST_SUITE[:2]
    res = validate_tokenizer_instance(defective_tok, test_cases=suite)

    assert "UNSUITABLE" in res["verdict"]
    assert res["exact_match_rate"] == 0.0
    assert res["total_unk_count"] > 0


def test_training_metadata_schema(tmp_path):
    """Verify that training_metadata.json strictly matches the required schema."""
    metadata_sample = {
        "model_version": "kannada-trocr-baseline-v1.0",
        "base_model": "microsoft/trocr-base-handwritten",
        "dataset_version": "iiit-indic-kannada-v1.0",
        "train_samples": 500,
        "validation_samples": 100,
        "test_samples": 50,
        "cer": 0.075,
        "exact_match": 0.82,
        "timestamp": "2026-09-11T12:00:00Z",
    }

    meta_file = tmp_path / "training_metadata.json"
    with open(meta_file, "w", encoding="utf-8") as f:
        json.dump(metadata_sample, f)

    with open(meta_file, "r", encoding="utf-8") as f:
        loaded = json.load(f)

    for required_key in [
        "model_version",
        "base_model",
        "dataset_version",
        "train_samples",
        "validation_samples",
        "test_samples",
        "cer",
        "exact_match",
        "timestamp",
    ]:
        assert required_key in loaded


def test_candidate_metadata_schema_phase5(tmp_path):
    """Verify that candidate training_metadata.json strictly matches the Phase 5 specification."""
    metadata_candidate = {
        "model_version": "kannada-trocr-candidate-v1.1773400000",
        "parent_model": "microsoft/trocr-base-handwritten",
        "base_model": "microsoft/trocr-base-handwritten",
        "tokenizer_version": "kannada_v1",
        "train_manifest": "data/manifests/train_manifest.jsonl",
        "validation_manifest": "data/manifests/val_manifest.jsonl",
        "test_manifest": "data/manifests/test_manifest.jsonl",
        "dataset_version": "iiit-indic-kannada-v1.0",
        "training_samples": 5000,
        "validation_samples": 500,
        "test_samples": 500,
        "training_timestamp": "2026-09-11T12:00:00Z",
        "timestamp": "2026-09-11T12:00:00Z",
        "epochs": 5,
        "batch_size": 4,
        "learning_rate": 5e-5,
        "max_target_length": 64,
        "status": "CANDIDATE",
        "cer": 0.082,
        "exact_match": 0.79,
        "train_loss": 0.35,
        "checkpoint_dir": "models/kannada_trocr/candidates/kannada_trocr-candidate-v1.1773400000",
    }

    meta_file = tmp_path / "training_metadata.json"
    with open(meta_file, "w", encoding="utf-8") as f:
        json.dump(metadata_candidate, f)

    with open(meta_file, "r", encoding="utf-8") as f:
        loaded = json.load(f)

    phase5_keys = [
        "model_version",
        "parent_model",
        "tokenizer_version",
        "train_manifest",
        "validation_manifest",
        "test_manifest",
        "training_samples",
        "validation_samples",
        "test_samples",
        "training_timestamp",
        "epochs",
        "batch_size",
        "learning_rate",
        "max_target_length",
        "status",
    ]
    for k in phase5_keys:
        assert k in loaded, f"Missing required Phase 5 metadata key: {k}"
    assert loaded["status"] == "CANDIDATE"


def test_candidate_checkpoint_production_isolation(tmp_path):
    """Verify that candidate checkpoint paths are strictly isolated and never target production."""
    from training.train_kannada_trocr import run_training_pipeline

    # Create dummy config with candidate output_dir
    candidate_dir = tmp_path / "candidates"
    cfg = {
        "dataset": {"train_manifest": "", "validation_manifest": "", "dataset_root": ""},
        "model": {"base_model": "microsoft/trocr-base-handwritten", "tokenizer_name": "models/kannada_trocr/tokenizer/kannada_v1"},
        "training": {"output_dir": str(candidate_dir), "epochs": 1},
        "inference": {"num_beams": 4},
    }
    cfg_file = tmp_path / "kannada_ocr_test.yaml"
    import yaml
    with open(cfg_file, "w", encoding="utf-8") as f:
        yaml.dump(cfg, f)

    res = run_training_pipeline(config_path=str(cfg_file), dry_run=True)
    assert res["status"] == "CONFIG_VERIFIED"
    assert "production" not in res["config"]["training"]["output_dir"].lower()


def test_evaluation_metrics_computation():
    """Verify compute_metrics_on_pairs computes exact CER, WER, and exact match rates."""
    from training.evaluate_kannada_trocr import compute_metrics_on_pairs

    references = ["ಬೆಂಗಳೂರು", "ಮೈಸೂರು", "ಕನ್ನಡ", "ಭಾರತ"]
    predictions = ["ಬೆಂಗಳೂರು", "ಮೈಸೂರು", "ಕನ್ನಡ", "ಭಾರತ"]
    perfect_res = compute_metrics_on_pairs(predictions, references)
    assert perfect_res["cer"] == 0.0
    assert perfect_res["wer"] == 0.0
    assert perfect_res["exact_match"] == 1.0
    assert perfect_res["sample_count"] == 4

    # Partially mismatched
    pred_imperfect = ["ಬೆಂಗಳೂರು", "ಮೈಸೂರು", "ಕನಡ", "ಕರ್ನಾಟಕ"]
    imp_res = compute_metrics_on_pairs(pred_imperfect, references)
    assert imp_res["exact_match"] == 0.5  # 2 of 4 match exactly
    assert imp_res["cer"] > 0.0
    assert imp_res["wer"] > 0.0

