"""
Kannada Tokenizer Builder & Vocabulary Adaptation Utility
=========================================================
Builds a Kannada-adapted tokenizer starting from the base TrOCR RoBERTa tokenizer
(microsoft/trocr-base-handwritten) and extracts reusable linguistic Kannada units
from the training dataset corpus (or standard Kannada Unicode inventory).

Key Principles:
1. Linguistic Generality:
   Does NOT hardcode specific application words.
   Extracts generic linguistic units:
   - All canonical Kannada Unicode characters (vowels, consonants, matras, virama, numerals 0-9)
   - Frequent Kannada aksharas (orthographic syllables) and subwords derived from corpus
2. Safety & Preservation:
   - Preserves all original 50,265 tokens and their exact IDs (0..50264)
   - Preserves special tokens: <s> (0), <pad> (1), </s> (2), <unk> (3)
   - Preserves English, numbers, and punctuation
   - Enforces Unicode NFC normalization
3. Metadata Tracking:
   - Generates tokenizer_metadata.json with versioning, base/new vocab sizes, added token count.
"""

import os
import sys
import json
import re
import shutil
import logging
import argparse
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Set, Tuple, Optional, Any
from collections import Counter

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("build_kannada_tokenizer")

# Ensure UTF-8 stdout on Windows
if sys.platform == "win32" and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Canonical Kannada Unicode Inventory (U+0C80 to U+0CFF)
KANNADA_VOWELS = [
    "ಅ", "ಆ", "ಇ", "ಈ", "ಉ", "ಊ", "ಋ", "ಌ", "ಎ", "ಏ", "ಐ", "ಒ", "ಓ", "ಔ"
]
KANNADA_CONSONANTS = [
    "ಕ", "ಖ", "ಗ", "ಘ", "ಙ",
    "ಚ", "ಛ", "ಜ", "ಝ", "ಞ",
    "ಟ", "ಠ", "ಡ", "ಢ", "ಣ",
    "ತ", "ಥ", "ದ", "ಧ", "ನ",
    "ಪ", "ಫ", "ಬ", "ಭ", "ಮ",
    "ಯ", "ರ", "ಱ", "ಲ", "ವ",
    "ಶ", "ಷ", "ಸ", "ಹ", "ಳ", "಴"
]
KANNADA_VOWEL_SIGNS = [
    "ಾ", "ಿ", "ೀ", "ು", "ೂ", "ೃ", "ೄ", "ೆ", "ೇ", "ೈ", "ೊ", "ೋ", "ೌ"
]
KANNADA_VIRAMA = "್"
KANNADA_YOGAVAHAS = ["ಂ", "ಃ"]
KANNADA_NUMERALS = ["೦", "೧", "೨", "೩", "೪", "೫", "೬", "೭", "೮", "೯"]
KANNADA_SIGNS = ["ಽ"]

# Regex for identifying Kannada akshara units:
# Independent vowel + optional yogavaha OR
# Consonant cluster (C + Virama)* + C + optional (Matra / Virama / Yogavaha)
AKSHARA_REGEX = re.compile(
    r"[\u0C85-\u0C94][\u0C82\u0C83]?"
    r"|"
    r"[\u0C95-\u0CB9\u0CDE](?:\u0CCD[\u0C95-\u0CB9\u0CDE])*(?:[\u0CBE-\u0CCC\u0CD5\u0CD6\u0C82\u0C83]|\u0CCD)?"
)


def extract_kannada_corpus_from_manifest(manifest_path: Path) -> List[str]:
    """Read training manifest JSONL and extract normalized Kannada text transcriptions."""
    if not manifest_path.is_file():
        logger.warning(f"Manifest file not found: {manifest_path}. Using base Kannada linguistic inventory.")
        return []

    transcriptions: List[str] = []
    with open(manifest_path, "r", encoding="utf-8") as f:
        for line_idx, line in enumerate(f, start=1):
            raw = line.strip()
            if not raw:
                continue
            try:
                rec = json.loads(raw)
                text = rec.get("text") or rec.get("ground_truth_text") or rec.get("transcription") or rec.get("label")
                if text:
                    norm = unicodedata.normalize("NFC", str(text).strip())
                    if any(0x0C80 <= ord(c) <= 0x0CFF for c in norm):
                        transcriptions.append(norm)
            except json.JSONDecodeError:
                continue

    logger.info(f"Extracted {len(transcriptions)} Kannada transcriptions from {manifest_path}")
    return transcriptions


def discover_kannada_vocabulary(
    corpus: List[str],
    min_frequency: int = 2,
    max_subwords: int = 3000,
) -> List[str]:
    """Discover generic Kannada linguistic units (characters, aksharas, frequent subwords)."""
    # 1. Fundamental linguistic inventory (always included)
    fundamental_chars: Set[str] = set()
    for char_group in [
        KANNADA_VOWELS,
        KANNADA_CONSONANTS,
        KANNADA_VOWEL_SIGNS,
        [KANNADA_VIRAMA],
        KANNADA_YOGAVAHAS,
        KANNADA_NUMERALS,
        KANNADA_SIGNS,
    ]:
        for c in char_group:
            fundamental_chars.add(unicodedata.normalize("NFC", c))

    # 2. Extract aksharas and subword n-grams from corpus
    akshara_counter = Counter()
    subword_counter = Counter()

    for text in corpus:
        # Discover individual characters appearing in corpus
        for ch in text:
            if 0x0C80 <= ord(ch) <= 0x0CFF:
                fundamental_chars.add(ch)

        # Discover aksharas (orthographic syllables)
        aksharas = AKSHARA_REGEX.findall(text)
        for ak in aksharas:
            if len(ak) > 1:  # Multi-character akshara (e.g. consonant + matra or conjunct)
                akshara_counter[ak] += 1

        # Discover frequent character bigrams / trigrams (reusable subwords)
        words = text.split()
        for w in words:
            for n in [2, 3, 4]:
                if len(w) >= n:
                    for i in range(len(w) - n + 1):
                        sub = w[i : i + n]
                        if any(0x0C80 <= ord(c) <= 0x0CFF for c in sub):
                            subword_counter[sub] += 1

    # Filter aksharas and subwords by frequency
    frequent_aksharas = [
        ak for ak, count in akshara_counter.most_common()
        if count >= min_frequency
    ]

    frequent_subwords = [
        sw for sw, count in subword_counter.most_common()
        if count >= max(min_frequency * 2, 4)
    ]

    # Combine units:
    # Order: single characters first, then frequent aksharas, then subwords
    ordered_tokens: List[str] = sorted(list(fundamental_chars))
    seen = set(ordered_tokens)

    # Add aksharas
    for ak in frequent_aksharas:
        if ak not in seen and len(ordered_tokens) < max_subwords:
            ordered_tokens.append(ak)
            seen.add(ak)

    # Add subwords
    for sw in frequent_subwords:
        if sw not in seen and len(ordered_tokens) < max_subwords:
            ordered_tokens.append(sw)
            seen.add(sw)

    logger.info(
        f"Discovered {len(ordered_tokens)} Kannada units "
        f"({len(fundamental_chars)} atomic characters, "
        f"{len(frequent_aksharas)} aksharas, "
        f"{len(ordered_tokens) - len(fundamental_chars) - len(frequent_aksharas)} subwords)."
    )
    return ordered_tokens


def build_adapted_kannada_tokenizer(
    base_tokenizer_dir: Path,
    output_dir: Path,
    train_manifest: Optional[Path] = None,
    min_frequency: int = 2,
    max_subwords: int = 3000,
    version: str = "kannada_v1",
) -> Dict[str, Any]:
    """Construct adapted RoBERTa tokenizer with Kannada vocabulary extension."""
    output_dir.mkdir(parents=True, exist_ok=True)

    # 1. Load base vocab and merges
    base_vocab_file = base_tokenizer_dir / "vocab.json"
    base_merges_file = base_tokenizer_dir / "merges.txt"

    if not base_vocab_file.is_file() or not base_merges_file.is_file():
        raise FileNotFoundError(
            f"Base tokenizer files missing in {base_tokenizer_dir}. Expected vocab.json and merges.txt."
        )

    with open(base_vocab_file, "r", encoding="utf-8") as f:
        base_vocab: Dict[str, int] = json.load(f)

    base_vocab_size = len(base_vocab)

    # Safety verification: ensure special tokens are at standard indices
    assert base_vocab.get("<s>") == 0, "Special token <s> missing or not at ID 0"
    assert base_vocab.get("<pad>") == 1, "Special token <pad> missing or not at ID 1"
    assert base_vocab.get("</s>") == 2, "Special token </s> missing or not at ID 2"
    assert base_vocab.get("<unk>") == 3, "Special token <unk> missing or not at ID 3"

    # 2. Extract corpus and discover vocabulary
    corpus = []
    if train_manifest and train_manifest.is_file():
        corpus = extract_kannada_corpus_from_manifest(train_manifest)

    kannada_tokens = discover_kannada_vocabulary(
        corpus=corpus,
        min_frequency=min_frequency,
        max_subwords=max_subwords,
    )

    # 3. Create extended vocabulary
    extended_vocab = dict(base_vocab)
    added_tokens_map = {}
    current_id = base_vocab_size

    for tok in kannada_tokens:
        if tok not in extended_vocab:
            extended_vocab[tok] = current_id
            added_tokens_map[tok] = current_id
            current_id += 1

    num_added = len(added_tokens_map)
    new_vocab_size = len(extended_vocab)

    # 4. Write new vocab.json and copy merges.txt
    dest_vocab = output_dir / "vocab.json"
    with open(dest_vocab, "w", encoding="utf-8") as f:
        json.dump(extended_vocab, f, ensure_ascii=False, indent=2)

    dest_merges = output_dir / "merges.txt"
    shutil.copy2(base_merges_file, dest_merges)

    # 5. Write added_tokens.json
    dest_added = output_dir / "added_tokens.json"
    with open(dest_added, "w", encoding="utf-8") as f:
        json.dump(added_tokens_map, f, ensure_ascii=False, indent=2)

    # 6. Construct and write tokenizer_config.json
    added_tokens_decoder = {}
    for tok, tid in added_tokens_map.items():
        added_tokens_decoder[str(tid)] = {
            "content": tok,
            "lstrip": False,
            "normalized": False,
            "rstrip": False,
            "single_word": False,
            "special": False,
        }

    tokenizer_config = {
        "errors": "replace",
        "bos_token": "<s>",
        "eos_token": "</s>",
        "pad_token": "<pad>",
        "unk_token": "<unk>",
        "mask_token": "<mask*",
        "tokenizer_class": "RobertaTokenizer",
        "added_tokens_decoder": added_tokens_decoder,
    }
    dest_tcfg = output_dir / "tokenizer_config.json"
    with open(dest_tcfg, "w", encoding="utf-8") as f:
        json.dump(tokenizer_config, f, ensure_ascii=False, indent=2)

    # 7. Write special_tokens_map.json
    special_tokens_map = {
        "bos_token": "<s>",
        "eos_token": "</s>",
        "pad_token": "<pad>",
        "unk_token": "<unk>",
        "mask_token": "<mask*",
    }
    dest_spec = output_dir / "special_tokens_map.json"
    with open(dest_spec, "w", encoding="utf-8") as f:
        json.dump(special_tokens_map, f, ensure_ascii=False, indent=2)

    # 8. Write tokenizer_metadata.json (strict audit document)
    metadata = {
        "version": version,
        "base_tokenizer": "microsoft/trocr-base-handwritten",
        "base_vocab_size": base_vocab_size,
        "new_vocab_size": new_vocab_size,
        "added_tokens": num_added,
        "dataset_manifest": str(train_manifest) if train_manifest else "canonical_kannada_inventory",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "unicode_normalization": "NFC",
        "special_tokens": {
            "bos_token_id": 0,
            "pad_token_id": 1,
            "eos_token_id": 2,
            "unk_token_id": 3,
        },
    }
    dest_meta = output_dir / "tokenizer_metadata.json"
    with open(dest_meta, "w", encoding="utf-8") as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)

    logger.info("=" * 70)
    logger.info(" KANNADA TOKENIZER ADAPTATION COMPLETE")
    logger.info("=" * 70)
    logger.info(f" Base Vocabulary Size:    {base_vocab_size}")
    logger.info(f" Newly Added Tokens:      {num_added}")
    logger.info(f" Total Vocabulary Size:   {new_vocab_size}")
    logger.info(f" Output Directory:        {output_dir}")
    logger.info(f" Special Tokens Verified: <s> (0), <pad> (1), </s> (2), <unk> (3)")
    logger.info("=" * 70)

    return metadata


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Build Kannada-adapted TrOCR tokenizer.")
    parser.add_argument(
        "--base-tokenizer",
        type=str,
        default="training/assets/trocr_tokenizer",
        help="Path to directory containing base TrOCR tokenizer files (vocab.json, merges.txt).",
    )
    parser.add_argument(
        "--train-manifest",
        type=str,
        default=None,
        help="Optional path to train_manifest.jsonl for corpus-derived subword extraction.",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="models/kannada_trocr/tokenizer/kannada_v1",
        help="Directory where adapted tokenizer files will be saved.",
    )
    parser.add_argument(
        "--min-frequency",
        type=int,
        default=2,
        help="Minimum occurrence frequency for corpus-derived subword tokens.",
    )
    parser.add_argument(
        "--max-subwords",
        type=int,
        default=3000,
        help="Maximum number of Kannada subword tokens to add.",
    )
    parser.add_argument(
        "--version",
        type=str,
        default="kannada_v1",
        help="Tokenizer version tag.",
    )
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    base_p = Path(args.base_tokenizer)
    out_p = Path(args.output_dir)
    manifest_p = Path(args.train_manifest) if args.train_manifest else None

    try:
        build_adapted_kannada_tokenizer(
            base_tokenizer_dir=base_p,
            output_dir=out_p,
            train_manifest=manifest_p,
            min_frequency=args.min_frequency,
            max_subwords=args.max_subwords,
            version=args.version,
        )
        return 0
    except Exception as exc:
        logger.error(f"Failed to build adapted tokenizer: {exc}", exc_info=True)
        return 1


if __name__ == "__main__":
    sys.exit(main())
