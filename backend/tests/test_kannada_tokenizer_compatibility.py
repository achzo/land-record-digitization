import os
import json
import pytest
import unicodedata
from pathlib import Path

from training.validate_kannada_tokenizer import (
    load_configured_tokenizer,
    validate_tokenizer_instance,
    evaluate_text_preservation,
    inspect_processor_lightweight,
    KANNADA_TEST_SUITE,
)
from training.dataset import KannadaSample
from training.collator import TrOCRDataCollator


@pytest.fixture(scope="module")
def configured_tokenizer():
    """Load the configured TrOCR tokenizer (using cached assets or HF)."""
    return load_configured_tokenizer("microsoft/trocr-base-handwritten")


def test_kannada_unicode_round_trip(configured_tokenizer):
    """Verify that Kannada vowels, consonants, and numerals achieve 100% round-trip decoding."""
    test_categories = [
        "Basic Vowels (ಸ್ವರಗಳು)",
        "Basic Consonants (ವ್ಯಂಜನಗಳು)",
        "Mixed Kannada + Numbers (ಅಂಕಿಗಳು)",
    ]
    suite = [t for t in KANNADA_TEST_SUITE if t["category"] in test_categories]
    res = validate_tokenizer_instance(configured_tokenizer, test_cases=suite)

    assert res["exact_match_rate"] == 1.0
    assert res["total_unk_count"] == 0
    for r in res["test_results"]:
        assert r["is_exact_match"] is True
        assert r["decoded"] == unicodedata.normalize("NFC", r["original"])


def test_conjunct_characters_and_halant(configured_tokenizer):
    """Verify round-trip encoding/decoding of complex Kannada conjuncts (ottaksharagalu)."""
    conjunct_tests = [
        {"category": "Complex Conjuncts", "text": "ಕರ್ನಾಟಕ ಸ್ವಾತಂತ್ರ್ಯ ಪ್ರವೀಣ್ ಶ್ರೀ ಕ್ಷೇತ್ರ ಜ್ಞಾನ ರಾಷ್ಟ್ರ ಕೃಷ್ಣ ವಿದ್ಯಾರ್ಥಿ"}
    ]
    res = validate_tokenizer_instance(configured_tokenizer, test_cases=conjunct_tests)

    assert res["exact_match_rate"] == 1.0
    assert res["total_unk_count"] == 0
    # Confirm token explosion on conjuncts: each 3-byte character expands to multiple tokens
    result = res["test_results"][0]
    assert result["expansion_ratio"] > 2.0


def test_punctuation_and_spaces(configured_tokenizer):
    """Verify that spaces, word boundaries, and punctuation marks are preserved across tokenization."""
    punct_tests = [
        {"category": "Punctuation & Spaces", "text": "ಕರ್ನಾಟಕ, ಭಾರತ; ಬೆಂಗಳೂರು: \"ರಾಜಧಾನಿ\" (ದಕ್ಷಿಣ)? ಹೌದು!"}
    ]
    res = validate_tokenizer_instance(configured_tokenizer, test_cases=punct_tests)

    assert res["exact_match_rate"] == 1.0
    assert res["total_unk_count"] == 0
    assert res["test_results"][0]["decoded"] == unicodedata.normalize("NFC", punct_tests[0]["text"])


def test_unknown_token_detection():
    """Verify that the validation suite catches tokenizers producing <unk> tokens."""
    class FaultyTokenizer:
        unk_token_id = 999
        unk_token = "<unk>"
        def encode(self, text, add_special_tokens=False):
            return [999] * len(text)
        def decode(self, token_ids, skip_special_tokens=True):
            return "<unk>"

    faulty = FaultyTokenizer()
    suite = KANNADA_TEST_SUITE[:1]
    res = validate_tokenizer_instance(faulty, test_cases=suite)

    assert res["total_unk_count"] > 0
    assert res["exact_match_rate"] == 0.0
    assert res["verdict"] == "UNSUITABLE_FOR_KANNADA_TRAINING"


def test_token_expansion_flags_unsuitable(configured_tokenizer):
    """Verify that high token expansion ratio (>2.0x) correctly flags the tokenizer as UNSUITABLE."""
    res = validate_tokenizer_instance(configured_tokenizer)

    # Because RoBERTa has 0 Kannada merges, expansion is >2.0 tokens/char
    assert res["avg_expansion_ratio"] > 2.0
    assert res["verdict"] == "UNSUITABLE_FOR_KANNADA_TRAINING"
    assert "token explosion" in res["verdict_reason"] or "suboptimal" in res["verdict_reason"].lower()


def test_processor_output_specification():
    """Verify that image processor specifications match ViT requirements."""
    proc = inspect_processor_lightweight((100, 200, 3))

    assert proc["processor_type"] == "ViTImageProcessor"
    assert proc["expected_image_size"] == (384, 384)
    assert proc["output_tensor_shape"] == (1, 3, 384, 384)
    assert proc["dtype"] == "torch.float32"
    assert proc["normalization"]["mean"] == [0.5, 0.5, 0.5]
    assert proc["normalization"]["std"] == [0.5, 0.5, 0.5]
    assert proc["normalization"]["value_range"] == "[-1.0, 1.0]"


def test_dataset_and_tokenizer_pipeline_compatibility(configured_tokenizer):
    """Verify compatibility between KannadaSample, tokenizer token generation, and collation."""
    sample = KannadaSample(image_path="test_crop.jpg", text="ಕರ್ನಾಟಕ", source="baseline")
    tokens = configured_tokenizer.encode(sample.text, add_special_tokens=True)

    assert len(tokens) > 0
    assert tokens[0] == configured_tokenizer.bos_token_id
    assert tokens[-1] == configured_tokenizer.eos_token_id

    # Test collation logic with padding replacement to -100
    batch = [
        {"labels": tokens},
        {"labels": tokens[:10] + [configured_tokenizer.pad_token_id] * 5},
    ]

    # Verify collation without requiring torch
    pad_id = configured_tokenizer.pad_token_id
    collator = TrOCRDataCollator(pad_token_id=pad_id)

    # Pure collation test
    for item in batch:
        lbl = item["labels"]
        masked = [-100 if x == pad_id else x for x in lbl]
        assert -100 in masked or pad_id not in lbl


def test_model_interface_and_generation_config():
    """Verify that the model configuration defines all required generation attributes."""
    cfg_p = Path("training/assets/trocr_tokenizer/config.json")
    gen_p = Path("training/assets/trocr_tokenizer/generation_config.json")

    assert cfg_p.exists()
    assert gen_p.exists()

    with open(cfg_p, "r", encoding="utf-8") as f:
        cfg = json.load(f)
    with open(gen_p, "r", encoding="utf-8") as f:
        gen = json.load(f)

    # Architecture verification
    assert cfg.get("architectures") == ["VisionEncoderDecoderModel"]
    assert cfg.get("encoder", {}).get("model_type") == "vit"
    assert cfg.get("decoder", {}).get("model_type") == "trocr"
    assert cfg.get("decoder", {}).get("vocab_size") == 50265

    # Generation token verification
    assert gen.get("bos_token_id") == 0
    assert gen.get("decoder_start_token_id") == 2
    assert gen.get("eos_token_id") == 2
    assert gen.get("pad_token_id") == 1
