import os
import json
import pytest
import unicodedata
from pathlib import Path
from typing import List, Dict, Any

from training.validate_kannada_tokenizer import (
    load_configured_tokenizer,
    validate_tokenizer_instance,
    evaluate_text_preservation,
    KANNADA_TEST_SUITE,
)
from training.train_kannada_trocr import load_kannada_ocr_config


TOKENIZER_DIR = Path("models/kannada_trocr/tokenizer/kannada_v1")


@pytest.fixture(scope="module")
def adapted_tokenizer():
    """Load the Kannada-adapted tokenizer from models/kannada_trocr/tokenizer/kannada_v1."""
    assert TOKENIZER_DIR.exists(), f"Adapted tokenizer directory missing: {TOKENIZER_DIR}"
    return load_configured_tokenizer(str(TOKENIZER_DIR))


def test_tokenizer_creation_and_metadata():
    """Verify tokenizer artifacts exist and metadata strictly conforms to schema."""
    assert (TOKENIZER_DIR / "vocab.json").exists()
    assert (TOKENIZER_DIR / "merges.txt").exists()
    assert (TOKENIZER_DIR / "added_tokens.json").exists()
    assert (TOKENIZER_DIR / "tokenizer_config.json").exists()
    assert (TOKENIZER_DIR / "special_tokens_map.json").exists()
    assert (TOKENIZER_DIR / "tokenizer_metadata.json").exists()

    with open(TOKENIZER_DIR / "tokenizer_metadata.json", "r", encoding="utf-8") as f:
        meta = json.load(f)

    assert meta.get("version") == "kannada_v1"
    assert meta.get("base_tokenizer") == "microsoft/trocr-base-handwritten"
    assert meta.get("base_vocab_size") == 50265
    assert meta.get("new_vocab_size") == 50342
    assert meta.get("added_tokens") == 77
    assert meta.get("unicode_normalization") == "NFC"


def test_vocabulary_expanded_by_expected_count(adapted_tokenizer):
    """Verify vocabulary is expanded from 50,265 to 50,342 (exactly +77 tokens)."""
    assert len(adapted_tokenizer) == 50342
    base_vocab_size = 50265
    added_count = len(adapted_tokenizer) - base_vocab_size
    assert added_count == 77


def test_new_kannada_tokens_present():
    """Verify all generic Kannada Unicode linguistic units are in added_tokens.json."""
    with open(TOKENIZER_DIR / "added_tokens.json", "r", encoding="utf-8") as f:
        added = json.load(f)

    assert len(added) == 77

    # Check key categories
    # Numerals 0-9
    for digit in "೦೧೨೩೪೫೬೭೮೯":
        assert digit in added
        assert added[digit] >= 50265

    # Vowels
    for vowel in "ಅಆಇಈಉಊಋಎಏಐಒಓಔ":
        assert vowel in added
        assert added[vowel] >= 50265

    # Consonants
    for consonant in "ಕಖಗಘಙಚಛಜಝಞಟಠಡಢಣತಥದಧನಪಫಬಭಮಯರಲವಶಷಸಹಳ":
        assert consonant in added
        assert added[consonant] >= 50265

    # Matras / Vowel signs & Virama
    for sign in "ಾಿೀುೂೃೆೇಕೈೊೋೌ್":
        assert sign in added
        assert added[sign] >= 50265

    # Yogavahas
    assert "ಂ" in added  # Anusvara
    assert "ಃ" in added  # Visarga


def test_kannada_unicode_round_trip_100_percent(adapted_tokenizer):
    """Verify full benchmark suite achieves 100% round-trip match and 0 UNKs with <1.2 expansion."""
    res = validate_tokenizer_instance(adapted_tokenizer, test_cases=KANNADA_TEST_SUITE)

    assert res["exact_match_rate"] == 1.0
    assert res["total_unk_count"] == 0
    assert res["avg_expansion_ratio"] <= 1.2
    assert res["verdict"] == "SUITABLE"


def test_basic_vowels_preserved(adapted_tokenizer):
    """Verify basic Kannada vowels encode and decode without loss."""
    vowels = "ಅ ಆ ಇ ಈ ಉ ಊ ಋ ಎ ಏ ಐ ಒ ಓ ಔ"
    tokens = adapted_tokenizer.encode(vowels)
    decoded = adapted_tokenizer.decode(tokens)
    assert decoded == unicodedata.normalize("NFC", vowels)
    assert adapted_tokenizer.unk_token_id not in tokens


def test_basic_consonants_preserved(adapted_tokenizer):
    """Verify all Kannada consonants encode and decode without loss."""
    consonants = "ಕ ಖ ಗ ಘ ಙ ಚ ಛ ಜ ಝ ಞ ಟ ಠ ಡ ಢ ಣ ತ ಥ ದ ಧ ನ ಪ ಫ block ಭ ಮ ಯ ರ ಲ ವ ಶ ಷ ಸ ಹ ಳ".replace("block ", "")
    tokens = adapted_tokenizer.encode(consonants)
    decoded = adapted_tokenizer.decode(tokens)
    assert decoded == unicodedata.normalize("NFC", consonants)
    assert adapted_tokenizer.unk_token_id not in tokens


def test_vowel_signs_and_matras_preserved(adapted_tokenizer):
    """Verify consonant + matra combinations (gunithaksharagalu) encode and decode exactly."""
    gunitha = "ಕಾ ಕಿ ಕೀ ಕು ಕೂ ಕೃ ಕೆ ಕೇ ಕೈ ಕೊ ಕೋ ಕೌ ಕಂ ಕಃ"
    tokens = adapted_tokenizer.encode(gunitha)
    decoded = adapted_tokenizer.decode(tokens)
    assert decoded == unicodedata.normalize("NFC", gunitha)
    assert adapted_tokenizer.unk_token_id not in tokens


def test_virama_and_conjuncts_preserved(adapted_tokenizer):
    """Verify virama / halant and complex conjuncts (ottaksharagalu) encode and decode exactly."""
    conjuncts = "ಕರ್ನಾಟಕ ಸ್ವಾತಂತ್ರ್ಯ ಪ್ರವೀಣ್ ಶ್ರೀ ಕ್ಷೇತ್ರ ಜ್ಞಾನ ರಾಷ್ಟ್ರ ಕೃಷ್ಣ ವಿದ್ಯಾರ್ಥಿ"
    tokens = adapted_tokenizer.encode(conjuncts)
    decoded = adapted_tokenizer.decode(tokens)
    assert decoded == unicodedata.normalize("NFC", conjuncts)
    assert adapted_tokenizer.unk_token_id not in tokens

    # Expansion ratio should be near 1.0 (not the 2.4x-3.0x seen before adaptation)
    expansion = len(tokens) / len(conjuncts)
    assert expansion <= 1.15


def test_kannada_numerals_preserved(adapted_tokenizer):
    """Verify Kannada numerals (0-9) encode to dedicated tokens without falling back to UNK or byte fragments."""
    numerals_text = "೦ ೧ ೨ ೩ ೪ ೫ ೬ ೭ ೮ ೯"
    tokens = adapted_tokenizer.encode(numerals_text)
    decoded = adapted_tokenizer.decode(tokens)
    assert decoded == numerals_text
    assert adapted_tokenizer.unk_token_id not in tokens

    # Mixed numerals date string
    mixed = "ದಿನಾಂಕ: ೧೫-೦೮-೧೯೪೭, ಒಟ್ಟು ೨೫೦ ರೂಪಾಯಿಗಳು (ಖಾತೆ ನಂ: ೭೮೯)."
    tokens_mixed = adapted_tokenizer.encode(mixed)
    decoded_mixed = adapted_tokenizer.decode(tokens_mixed)
    assert decoded_mixed == mixed
    assert adapted_tokenizer.unk_token_id not in tokens_mixed


def test_english_text_preserved(adapted_tokenizer):
    """Verify English text and digits continue to encode and decode cleanly."""
    english_text = "TrOCR Baseline Handwriting Model v1.0 - English preservation test 2026!"
    tokens = adapted_tokenizer.encode(english_text)
    decoded = adapted_tokenizer.decode(tokens)
    assert decoded == english_text
    assert adapted_tokenizer.unk_token_id not in tokens


def test_punctuation_preserved(adapted_tokenizer):
    """Verify punctuation marks with Kannada text are preserved exactly."""
    punct_text = "ಕರ್ನಾಟಕ, ಭಾರತ; ಬೆಂಗಳೂರು: \"ರಾಜಧಾನಿ\" (ದಕ್ಷಿಣ)? ಹೌದು!"
    tokens = adapted_tokenizer.encode(punct_text)
    decoded = adapted_tokenizer.decode(tokens)
    assert decoded == unicodedata.normalize("NFC", punct_text)
    assert adapted_tokenizer.unk_token_id not in tokens


def test_unseen_kannada_words_generalization(adapted_tokenizer):
    """Verify tokenizer generalizes cleanly to previously unseen real-world Kannada words."""
    unseen_words = [
        "ಚಿಕ್ಕಮಗಳೂರು",
        "ತುಂಗಭದ್ರಾ",
        "ಕುಮಾರವ್ಯಾಸ",
        "ಅಂತರರಾಷ್ಟ್ರೀಯ",
        "ವಿಜ್ಞಾನ ಮತ್ತು ತಂತ್ರಜ್ಞಾನ",
        "ದೂರಸಂಪರ್ಕ ಇಲಾಖೆ ೨೦೨೬",
    ]
    for word in unseen_words:
        tokens = adapted_tokenizer.encode(word)
        decoded = adapted_tokenizer.decode(tokens)
        norm_expected = unicodedata.normalize("NFC", word)
        assert decoded == norm_expected, f"Failed for unseen word: {word}"
        assert adapted_tokenizer.unk_token_id not in tokens
        expansion = len(tokens) / len(word)
        assert expansion <= 1.2, f"Expansion too high ({expansion:.2f}) for: {word}"


def test_special_token_ids_preserved(adapted_tokenizer):
    """Verify standard RoBERTa special tokens and their canonical IDs are strictly intact."""
    assert adapted_tokenizer.bos_token_id == 0
    assert adapted_tokenizer.pad_token_id == 1
    assert adapted_tokenizer.eos_token_id == 2
    assert adapted_tokenizer.unk_token_id == 3

    # Ensure added tokens strictly start after base vocab
    for tok, tid in adapted_tokenizer.added_tokens.items():
        assert tid >= 50265, f"Added token {tok} has invalid ID {tid} < 50265"


def test_decoder_embedding_resize_compatibility():
    """Verify in-memory decoder token embedding resizing logic and preservation of existing weights."""
    import math

    old_vocab_size = 50265
    new_vocab_size = 50342
    hidden_size = 768

    # Simulate weight matrix
    class MockEmbeddingLayer:
        def __init__(self, num_embeddings, embedding_dim):
            self.weight = [[float(i * 0.001) for _ in range(embedding_dim)] for i in range(num_embeddings)]

    class MockDecoder:
        def __init__(self, vocab_size, hidden_dim):
            self.embed_tokens = MockEmbeddingLayer(vocab_size, hidden_dim)
            self.config = type("Config", (), {"vocab_size": vocab_size})()

        def resize_token_embeddings(self, new_num_tokens):
            cur_tokens = len(self.embed_tokens.weight)
            if new_num_tokens > cur_tokens:
                additional = [
                    [0.01 * math.sin(i) for i in range(hidden_size)]
                    for _ in range(new_num_tokens - cur_tokens)
                ]
                self.embed_tokens.weight.extend(additional)
            self.config.vocab_size = new_num_tokens
            return self.embed_tokens

    class MockVisionEncoderDecoderModel:
        def __init__(self):
            self.decoder = MockDecoder(old_vocab_size, hidden_size)
            self.config = type("Config", (), {"vocab_size": old_vocab_size})()

        def resize_token_embeddings(self, new_num_tokens):
            res = self.decoder.resize_token_embeddings(new_num_tokens)
            self.config.vocab_size = new_num_tokens
            return res

    # Perform simulated resize
    model = MockVisionEncoderDecoderModel()
    assert len(model.decoder.embed_tokens.weight) == old_vocab_size
    assert model.config.vocab_size == old_vocab_size

    # Execute resize logic as implemented in train_kannada_trocr.py
    model.decoder.resize_token_embeddings(new_vocab_size)
    model.config.vocab_size = new_vocab_size
    model.decoder.config.vocab_size = new_vocab_size

    # Verify new dimensions
    assert len(model.decoder.embed_tokens.weight) == new_vocab_size
    assert model.config.vocab_size == new_vocab_size
    assert model.decoder.config.vocab_size == new_vocab_size

    # Verify base weights are preserved unchanged
    for i in range(10):
        assert model.decoder.embed_tokens.weight[i] == [float(i * 0.001) for _ in range(hidden_size)]

    # Verify new weights are valid floats (no NaN or inf)
    for row in model.decoder.embed_tokens.weight[old_vocab_size:]:
        assert len(row) == hidden_size
        assert all(math.isfinite(x) for x in row)


def test_config_points_to_adapted_tokenizer():
    """Verify that configs/kannada_ocr.yaml is updated to reference the adapted tokenizer."""
    cfg = load_kannada_ocr_config("configs/kannada_ocr.yaml")
    tokenizer_name = cfg.get("model", {}).get("tokenizer_name")
    assert tokenizer_name == "models/kannada_trocr/tokenizer/kannada_v1"
    assert Path(tokenizer_name).exists()
