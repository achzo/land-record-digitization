"""
IIIT-INDIC-HW-WORDS Kannada Dataset Preparation & Validation Utility
====================================================================
Converts official IIIT-INDIC-HW-WORDS-Kannada dataset folder structures:
    <dataset_root>/
        train/
            images/
            train_gt.txt (or gt.txt)
        val/ (or validation/)
            images/
            val_gt.txt (or validation_gt.txt or gt.txt)
        test/
            images/
            test_gt.txt (or gt.txt)

into standardized JSONL manifests consumable by TrOCR baseline training:
    <output_dir>/
        train_manifest.jsonl
        val_manifest.jsonl
        test_manifest.jsonl

Schema of each JSONL line:
{
    "image": "train/images/word_01.jpg",
    "text": "ಕನ್ನಡ",
    "source": "baseline",
    "verified_by_human": true
}

Features:
- Robust ground-truth file discovery across folder hierarchies and naming variations.
- Robust line parser supporting whitespace/tab delimiters (<image_path_or_name> <transcription>).
- Automatic Unicode NFC normalization to prevent Kannada character decomposition divergences.
- Image existence and PIL integrity verification (catching missing, truncated, or corrupt image files).
- Intra-split deduplication and conflict tracking.
- Cross-split data leakage detection (ensures zero overlap between train, val, and test splits).
- Dry-run validation mode (--validate-only) for comprehensive data auditing without writing files.
- Formatted console audit summary and optional JSON report export.
"""

import os
import sys
import json
import logging
import argparse
import unicodedata
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple, Set

try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("prepare_iiit_dataset")

# Standard split folder / file candidate names
SPLIT_CANDIDATES = {
    "train": ["train"],
    "val": ["val", "validation", "valid"],
    "test": ["test"],
}

GT_FILE_CANDIDATES = [
    "{split}_gt.txt",
    "gt.txt",
    "{split}.txt",
    "{alias}_gt.txt",
    "{alias}.txt",
]


@dataclass
class SplitStats:
    split_name: str
    gt_file: Optional[str] = None
    total_rows: int = 0
    valid_samples: int = 0
    missing_images: int = 0
    unreadable_images: int = 0
    empty_transcriptions: int = 0
    malformed_rows: int = 0
    duplicate_rows: int = 0
    conflicting_labels: int = 0
    missing_image_examples: List[str] = field(default_factory=list)
    corrupt_image_examples: List[str] = field(default_factory=list)


@dataclass
class DatasetReport:
    dataset_root: str
    output_dir: Optional[str] = None
    splits: Dict[str, SplitStats] = field(default_factory=dict)
    leakage_train_val: List[str] = field(default_factory=list)
    leakage_train_test: List[str] = field(default_factory=list)
    leakage_val_test: List[str] = field(default_factory=list)
    is_valid: bool = True
    errors: List[str] = field(default_factory=list)


def find_split_dir(dataset_root: Path, split_name: str) -> Optional[Path]:
    """Find the directory corresponding to a given split."""
    aliases = SPLIT_CANDIDATES.get(split_name, [split_name])
    for alias in aliases:
        cand = dataset_root / alias
        if cand.is_dir():
            return cand
    return None


def find_ground_truth_file(
    dataset_root: Path,
    split_name: str,
    split_dir: Optional[Path] = None,
    explicit_path: Optional[str] = None,
) -> Optional[Path]:
    """Locate ground truth annotation file for a split with fallback heuristics."""
    if explicit_path:
        p = Path(explicit_path)
        if p.is_file():
            return p
        raise FileNotFoundError(f"Specified ground truth file not found: {explicit_path}")

    aliases = SPLIT_CANDIDATES.get(split_name, [split_name])

    # 1. Search inside split directory (e.g., train/train_gt.txt, train/gt.txt)
    if split_dir and split_dir.is_dir():
        for alias in aliases:
            for pattern in GT_FILE_CANDIDATES:
                filename = pattern.format(split=split_name, alias=alias)
                cand = split_dir / filename
                if cand.is_file():
                    return cand

    # 2. Search inside dataset_root (e.g., dataset/train_gt.txt, dataset/train.txt)
    for alias in aliases:
        for pattern in GT_FILE_CANDIDATES:
            filename = pattern.format(split=split_name, alias=alias)
            cand = dataset_root / filename
            if cand.is_file():
                return cand

    return None


def resolve_image_path(
    dataset_root: Path,
    split_dir: Optional[Path],
    img_token: str,
) -> Optional[Tuple[Path, str]]:
    """Resolve an image reference from GT to an actual file on disk and its relative path from dataset_root.

    Returns:
        Tuple of (absolute_file_path, relative_path_from_dataset_root) or None if missing.
    """
    token_p = Path(img_token.strip().replace("\\", "/"))

    candidates_to_try = []

    # Direct relative to dataset_root
    candidates_to_try.append(dataset_root / token_p)

    if split_dir:
        # Relative to split_dir
        candidates_to_try.append(split_dir / token_p)
        # Relative to split_dir/images
        candidates_to_try.append(split_dir / "images" / token_p)

        # If token starts with "images/", try without "images/" or with split_dir
        if token_p.parts and token_p.parts[0] == "images":
            sub = Path(*token_p.parts[1:])
            candidates_to_try.append(split_dir / sub)

    # Check candidates
    for cand in candidates_to_try:
        if cand.is_file():
            abs_cand = cand.resolve()
            root_resolved = dataset_root.resolve()
            try:
                rel = abs_cand.relative_to(root_resolved).as_posix()
            except ValueError:
                rel = abs_cand.as_posix()
            return abs_cand, rel

    return None


IMAGE_MAGIC_BYTES = [
    b"\xff\xd8\xff",       # JPEG
    b"\x89PNG\r\n\x1a\n",  # PNG
    b"GIF87a",             # GIF
    b"GIF89a",             # GIF
    b"BM",                 # BMP
    b"II*\x00",            # TIFF (little endian)
    b"MM\x00*",            # TIFF (big endian)
]


def verify_image_readable(image_path: Path) -> bool:
    """Verify that an image file can be opened and parsed by PIL or has valid image headers."""
    if not image_path.is_file():
        return False

    if PIL_AVAILABLE:
        try:
            with Image.open(image_path) as img:
                img.verify()
            return True
        except Exception:
            return False

    # Fallback header check when PIL is not available
    try:
        with open(image_path, "rb") as f:
            header = f.read(16)
        if any(header.startswith(magic) for magic in IMAGE_MAGIC_BYTES):
            return True
        if header.startswith(b"RIFF") and header[8:12] == b"WEBP":
            return True
        return False
    except Exception:
        return False


def process_split(
    dataset_root: Path,
    split_name: str,
    gt_file: Path,
    split_dir: Optional[Path],
    check_readable: bool = True,
) -> Tuple[List[Dict[str, Any]], SplitStats, Set[str]]:
    """Parse and validate one dataset split."""
    stats = SplitStats(split_name=split_name, gt_file=str(gt_file))
    valid_records: List[Dict[str, Any]] = []
    seen_images: Dict[str, str] = {}  # rel_path -> normalized_text
    image_paths_set: Set[str] = set()

    logger.info(f"Processing split '{split_name}' from GT file: {gt_file}")

    with open(gt_file, "r", encoding="utf-8") as f:
        for line_num, line in enumerate(f, start=1):
            raw_line = line.strip()
            if not raw_line or raw_line.startswith("#"):
                continue

            stats.total_rows += 1

            # Check if there is whitespace after image token
            raw_trimmed = line.rstrip("\r\n")
            parts = raw_line.split(None, 1)
            if len(parts) < 2:
                # If the line had whitespace/tab separating an image name from empty text
                if len(raw_trimmed) > len(parts[0]):
                    stats.empty_transcriptions += 1
                else:
                    stats.malformed_rows += 1
                continue

            img_token, raw_text = parts[0].strip(), parts[1].strip()

            # 1. Unicode Normalization (NFC)
            normalized_text = unicodedata.normalize("NFC", raw_text)
            if not normalized_text:
                stats.empty_transcriptions += 1
                continue

            # 2. Resolve image path
            resolved = resolve_image_path(dataset_root, split_dir, img_token)
            if not resolved:
                stats.missing_images += 1
                if len(stats.missing_image_examples) < 5:
                    stats.missing_image_examples.append(img_token)
                continue

            abs_img, rel_img = resolved

            # 3. Readability check
            if check_readable and not verify_image_readable(abs_img):
                stats.unreadable_images += 1
                if len(stats.corrupt_image_examples) < 5:
                    stats.corrupt_image_examples.append(rel_img)
                continue

            # 4. Intra-split deduplication and conflict check
            if rel_img in seen_images:
                prev_text = seen_images[rel_img]
                if prev_text == normalized_text:
                    stats.duplicate_rows += 1
                    continue
                else:
                    stats.conflicting_labels += 1
                    logger.warning(
                        f"Conflicting labels for '{rel_img}': '{prev_text}' vs '{normalized_text}'. Keeping first."
                    )
                    continue

            seen_images[rel_img] = normalized_text
            image_paths_set.add(rel_img)

            # 5. Create valid JSONL record strictly matching system contract
            record = {
                "image": rel_img,
                "text": normalized_text,
                "source": "baseline",
                "verified_by_human": True,
            }
            valid_records.append(record)
            stats.valid_samples += 1

    return valid_records, stats, image_paths_set


def prepare_iiit_dataset(
    dataset_root: str,
    output_dir: Optional[str] = None,
    validate_only: bool = False,
    check_readable: bool = True,
    train_gt: Optional[str] = None,
    val_gt: Optional[str] = None,
    test_gt: Optional[str] = None,
) -> DatasetReport:
    """Main preparation and validation routine for IIIT-INDIC-HW-WORDS Kannada dataset."""
    root_p = Path(dataset_root).resolve()
    if not root_p.is_dir():
        raise FileNotFoundError(f"Dataset root directory does not exist: {root_p}")

    out_p = Path(output_dir).resolve() if output_dir else root_p / "manifests"

    report = DatasetReport(dataset_root=str(root_p), output_dir=str(out_p))

    explicit_gts = {
        "train": train_gt,
        "val": val_gt,
        "test": test_gt,
    }

    all_records: Dict[str, List[Dict[str, Any]]] = {}
    split_images: Dict[str, Set[str]] = {}

    # Process each standard split
    for split_name in ["train", "val", "test"]:
        split_dir = find_split_dir(root_p, split_name)
        gt_file = find_ground_truth_file(
            dataset_root=root_p,
            split_name=split_name,
            split_dir=split_dir,
            explicit_path=explicit_gts[split_name],
        )

        if not gt_file:
            msg = f"Ground truth file for split '{split_name}' could not be found under {root_p}."
            logger.error(msg)
            report.errors.append(msg)
            report.is_valid = False
            report.splits[split_name] = SplitStats(split_name=split_name)
            continue

        records, stats, img_set = process_split(
            dataset_root=root_p,
            split_name=split_name,
            gt_file=gt_file,
            split_dir=split_dir,
            check_readable=check_readable,
        )

        all_records[split_name] = records
        report.splits[split_name] = stats
        split_images[split_name] = img_set

    # Cross-split data leakage detection
    train_imgs = split_images.get("train", set())
    val_imgs = split_images.get("val", set())
    test_imgs = split_images.get("test", set())

    leak_train_val = sorted(list(train_imgs & val_imgs))
    leak_train_test = sorted(list(train_imgs & test_imgs))
    leak_val_test = sorted(list(val_imgs & test_imgs))

    # Also detect if identical image filenames exist across splits (even if under different directories)
    train_names = {Path(p).name: p for p in train_imgs}
    val_names = {Path(p).name: p for p in val_imgs}
    test_names = {Path(p).name: p for p in test_imgs}

    for name in sorted(list(set(train_names.keys()) & set(val_names.keys()))):
        p1, p2 = train_names[name], val_names[name]
        entry = p1 if p1 == p2 else f"{p1} <=> {p2}"
        if entry not in leak_train_val:
            leak_train_val.append(entry)

    for name in sorted(list(set(train_names.keys()) & set(test_names.keys()))):
        p1, p2 = train_names[name], test_names[name]
        entry = p1 if p1 == p2 else f"{p1} <=> {p2}"
        if entry not in leak_train_test:
            leak_train_test.append(entry)

    for name in sorted(list(set(val_names.keys()) & set(test_names.keys()))):
        p1, p2 = val_names[name], test_names[name]
        entry = p1 if p1 == p2 else f"{p1} <=> {p2}"
        if entry not in leak_val_test:
            leak_val_test.append(entry)

    report.leakage_train_val = sorted(leak_train_val)
    report.leakage_train_test = sorted(leak_train_test)
    report.leakage_val_test = sorted(leak_val_test)

    if leak_train_val:
        msg = f"CRITICAL: {len(leak_train_val)} images overlap/leak between train and val splits!"
        logger.error(msg)
        report.errors.append(msg)
        report.is_valid = False

    if leak_train_test:
        msg = f"CRITICAL: {len(leak_train_test)} images overlap/leak between train and test splits!"
        logger.error(msg)
        report.errors.append(msg)
        report.is_valid = False

    if leak_val_test:
        msg = f"CRITICAL: {len(leak_val_test)} images overlap/leak between val and test splits!"
        logger.error(msg)
        report.errors.append(msg)
        report.is_valid = False

    # Check for empty valid sets
    for split_name in ["train", "val", "test"]:
        s = report.splits.get(split_name)
        if s and s.valid_samples == 0:
            msg = f"Split '{split_name}' has 0 valid samples."
            logger.warning(msg)
            report.errors.append(msg)
            report.is_valid = False

    # Write manifests if not in dry-run mode and valid
    if not validate_only:
        out_p.mkdir(parents=True, exist_ok=True)
        manifest_filenames = {
            "train": "train_manifest.jsonl",
            "val": "val_manifest.jsonl",
            "test": "test_manifest.jsonl",
        }
        for split_name, records in all_records.items():
            dest_file = out_p / manifest_filenames[split_name]
            with open(dest_file, "w", encoding="utf-8") as f:
                for rec in records:
                    f.write(json.dumps(rec, ensure_ascii=False) + "\n")
            logger.info(f"Wrote {len(records)} samples to {dest_file}")

    return report


def print_audit_report(report: DatasetReport) -> None:
    """Print a clean human-readable audit table of dataset validation."""
    print("\n" + "=" * 78)
    print(" IIIT-INDIC-HW-WORDS Kannada Dataset Preparation & Audit Report")
    print("=" * 78)
    print(f" Dataset Root: {report.dataset_root}")
    print(f" Output Dir:   {report.output_dir}")
    print("-" * 78)
    print(f"{'Split':<8} | {'Total':<8} | {'Valid':<8} | {'Missing':<8} | {'Corrupt':<8} | {'Empty/Bad':<10} | {'Dups':<6}")
    print("-" * 78)

    for split_name in ["train", "val", "test"]:
        stats = report.splits.get(split_name)
        if not stats:
            print(f"{split_name:<8} | {'N/A':<8} | {'N/A':<8} | {'N/A':<8} | {'N/A':<8} | {'N/A':<10} | {'N/A':<6}")
            continue
        empty_or_bad = stats.empty_transcriptions + stats.malformed_rows
        print(
            f"{split_name:<8} | {stats.total_rows:<8} | {stats.valid_samples:<8} | "
            f"{stats.missing_images:<8} | {stats.unreadable_images:<8} | {empty_or_bad:<10} | {stats.duplicate_rows:<6}"
        )

    print("-" * 78)
    print(" Data Leakage Check Across Splits:")
    print(f"  - Overlap train & val:  {len(report.leakage_train_val)} samples")
    print(f"  - Overlap train & test: {len(report.leakage_train_test)} samples")
    print(f"  - Overlap val & test:   {len(report.leakage_val_test)} samples")
    print("-" * 78)

    if report.errors:
        print(" ERRORS DETECTED:")
        for err in report.errors:
            print(f"  [!] {err}")
        print("-" * 78)

    status_str = "PASSED" if report.is_valid else "FAILED / INCOMPLETE"
    print(f" Overall Dataset Status: {status_str}")
    print("=" * 78 + "\n")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Convert and validate IIIT-INDIC-HW-WORDS Kannada dataset into TrOCR JSONL manifests."
    )
    parser.add_argument(
        "--dataset-root",
        type=str,
        required=True,
        help="Path to the root of the unzipped IIIT-INDIC-HW-WORDS-Kannada dataset.",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default=None,
        help="Directory to write JSONL manifests (defaults to <dataset-root>/manifests).",
    )
    parser.add_argument(
        "--validate-only",
        action="store_true",
        help="Dry run: validate dataset integrity and print audit report without writing manifests.",
    )
    parser.add_argument(
        "--no-check-readable",
        action="store_true",
        help="Skip PIL image decoding/readability check (faster, checks file existence only).",
    )
    parser.add_argument(
        "--train-gt",
        type=str,
        default=None,
        help="Explicit path to train ground truth file (overrides auto-discovery).",
    )
    parser.add_argument(
        "--val-gt",
        type=str,
        default=None,
        help="Explicit path to val ground truth file (overrides auto-discovery).",
    )
    parser.add_argument(
        "--test-gt",
        type=str,
        default=None,
        help="Explicit path to test ground truth file (overrides auto-discovery).",
    )
    parser.add_argument(
        "--summary-json",
        type=str,
        default=None,
        help="Optional path to write the validation report as a JSON file.",
    )
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    check_readable = not args.no_check_readable

    try:
        report = prepare_iiit_dataset(
            dataset_root=args.dataset_root,
            output_dir=args.output_dir,
            validate_only=args.validate_only,
            check_readable=check_readable,
            train_gt=args.train_gt,
            val_gt=args.val_gt,
            test_gt=args.test_gt,
        )
    except Exception as exc:
        logger.error(f"Preparation failed: {exc}", exc_info=True)
        return 1

    print_audit_report(report)

    if args.summary_json:
        sum_p = Path(args.summary_json)
        sum_p.parent.mkdir(parents=True, exist_ok=True)
        with open(sum_p, "w", encoding="utf-8") as f:
            json.dump(asdict(report), f, indent=2, ensure_ascii=False)
        logger.info(f"Saved audit summary to {sum_p}")

    return 0 if report.is_valid else 1


if __name__ == "__main__":
    sys.exit(main())
