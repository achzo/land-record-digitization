import os
import sys
import json
import pytest
import unicodedata
from pathlib import Path
try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

from training.dataset import parse_manifest_file
from training.prepare_iiit_kannada_dataset import (
    prepare_iiit_dataset,
    print_audit_report,
    build_parser,
    main,
    verify_image_readable,
)


# Minimal valid 1x1 GIF bytes (recognized by standard image viewers & Pillow)
MINIMAL_IMAGE_BYTES = (
    b"GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04"
    b"\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;"
)


def create_dummy_image(path: Path):
    """Create a minimal valid image file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "wb") as f:
        f.write(MINIMAL_IMAGE_BYTES)


def create_synthetic_iiit_dataset(root: Path):
    """Set up a clean mock IIIT-INDIC-HW-WORDS-Kannada folder structure."""
    splits = {
        "train": [
            ("word_tr1.jpg", "ಕನ್ನಡ"),
            ("word_tr2.jpg", "ಬೆಂಗಳೂರು"),
            ("word_tr3.jpg", "ಕರ್ನಾಟಕ"),
        ],
        "val": [
            ("word_val1.jpg", "ಮೈಸೂರು"),
            ("word_val2.jpg", "ಹುಬ್ಬಳ್ಳಿ"),
        ],
        "test": [
            ("word_ts1.jpg", "ಧಾರವಾಡ"),
            ("word_ts2.jpg", "ಬೆಳಗಾವಿ"),
        ],
    }

    for split_name, samples in splits.items():
        split_dir = root / split_name
        img_dir = split_dir / "images"
        img_dir.mkdir(parents=True, exist_ok=True)

        gt_file = split_dir / f"{split_name}_gt.txt"
        with open(gt_file, "w", encoding="utf-8") as f:
            for fname, text in samples:
                create_dummy_image(img_dir / fname)
                f.write(f"{fname} {text}\n")

    return splits


def test_prepare_iiit_dataset_end_to_end(tmp_path):
    """Verify standard end-to-end dataset conversion and JSONL manifest generation."""
    dataset_root = tmp_path / "iiit_kannada"
    dataset_root.mkdir()
    splits = create_synthetic_iiit_dataset(dataset_root)

    out_dir = dataset_root / "manifests"
    report = prepare_iiit_dataset(
        dataset_root=str(dataset_root),
        output_dir=str(out_dir),
        validate_only=False,
        check_readable=True,
    )

    assert report.is_valid is True
    assert len(report.errors) == 0
    assert len(report.leakage_train_val) == 0
    assert len(report.leakage_train_test) == 0
    assert len(report.leakage_val_test) == 0

    assert report.splits["train"].valid_samples == 3
    assert report.splits["val"].valid_samples == 2
    assert report.splits["test"].valid_samples == 2

    # Manifests should exist
    train_m = out_dir / "train_manifest.jsonl"
    val_m = out_dir / "val_manifest.jsonl"
    test_m = out_dir / "test_manifest.jsonl"

    assert train_m.exists()
    assert val_m.exists()
    assert test_m.exists()

    # Verify JSONL contract
    with open(train_m, "r", encoding="utf-8") as f:
        lines = [json.loads(line) for line in f if line.strip()]
        assert len(lines) == 3
        for item in lines:
            assert item["source"] == "baseline"
            assert item["verified_by_human"] is True
            assert item["image"].startswith("train/images/")
            assert len(item["text"]) > 0

    # Cross-verify with training/dataset.py:parse_manifest_file
    parsed_samples = parse_manifest_file(
        train_m,
        dataset_root=dataset_root,
        strict_human_verified_only=True,
    )
    assert len(parsed_samples) == 3
    assert all(s.verified_by_human is True for s in parsed_samples)
    assert all(Path(s.image_path).exists() for s in parsed_samples)


def test_validate_only_dry_run(tmp_path):
    """Verify that --validate-only audits the dataset without writing manifest files."""
    dataset_root = tmp_path / "iiit_kannada_dryrun"
    dataset_root.mkdir()
    create_synthetic_iiit_dataset(dataset_root)

    out_dir = dataset_root / "manifests"
    report = prepare_iiit_dataset(
        dataset_root=str(dataset_root),
        output_dir=str(out_dir),
        validate_only=True,
        check_readable=True,
    )

    assert report.is_valid is True
    assert not out_dir.exists()


def test_missing_and_corrupt_images(tmp_path):
    """Verify detection of missing image files and corrupted image bytes."""
    dataset_root = tmp_path / "iiit_corrupt_test"
    dataset_root.mkdir()
    create_synthetic_iiit_dataset(dataset_root)

    # Inject missing and corrupt images into train split
    train_dir = dataset_root / "train"
    train_gt = train_dir / "train_gt.txt"

    # Corrupt image (invalid header/data)
    corrupt_path = train_dir / "images" / "corrupt_img.jpg"
    with open(corrupt_path, "wb") as f:
        f.write(b"NOT_A_REAL_IMAGE_DATA_CORRUPTED_BYTES")

    with open(train_gt, "a", encoding="utf-8") as f:
        f.write("corrupt_img.jpg ದೋಷಪೂರಿತ\n")
        f.write("missing_img.jpg ಕಣ್ಮರೆಯಾದ\n")

    report = prepare_iiit_dataset(
        dataset_root=str(dataset_root),
        validate_only=True,
        check_readable=True,
    )

    train_stats = report.splits["train"]
    assert train_stats.valid_samples == 3
    assert train_stats.missing_images == 1
    assert train_stats.unreadable_images == 1
    assert "missing_img.jpg" in train_stats.missing_image_examples[0]


def test_empty_transcription_and_malformed_lines(tmp_path):
    """Verify that empty, blank, or malformed rows are caught without crashing."""
    dataset_root = tmp_path / "iiit_malformed_test"
    dataset_root.mkdir()
    create_synthetic_iiit_dataset(dataset_root)

    train_dir = dataset_root / "train"
    train_gt = train_dir / "train_gt.txt"

    # Create dummy images for the lines
    create_dummy_image(train_dir / "images" / "extra1.jpg")
    create_dummy_image(train_dir / "images" / "extra2.jpg")

    with open(train_gt, "a", encoding="utf-8") as f:
        f.write("# comment line\n")
        f.write("   \n")
        f.write("extra1.jpg\n")  # missing transcription
        f.write("extra2.jpg   \n")  # whitespace-only transcription

    report = prepare_iiit_dataset(
        dataset_root=str(dataset_root),
        validate_only=True,
    )

    train_stats = report.splits["train"]
    assert train_stats.valid_samples == 3
    assert train_stats.malformed_rows == 1
    assert train_stats.empty_transcriptions == 1


def test_intra_split_deduplication_and_conflicts(tmp_path):
    """Verify that identical duplicate rows are deduplicated and conflicting labels logged."""
    dataset_root = tmp_path / "iiit_dedup_test"
    dataset_root.mkdir()
    create_synthetic_iiit_dataset(dataset_root)

    train_dir = dataset_root / "train"
    train_gt = train_dir / "train_gt.txt"

    with open(train_gt, "a", encoding="utf-8") as f:
        # Exact duplicate
        f.write("word_tr1.jpg ಕನ್ನಡ\n")
        # Conflict for same image
        f.write("word_tr2.jpg ಬೇರೆ_ಪದ\n")

    report = prepare_iiit_dataset(
        dataset_root=str(dataset_root),
        validate_only=True,
    )

    train_stats = report.splits["train"]
    assert train_stats.duplicate_rows == 1
    assert train_stats.conflicting_labels == 1
    assert train_stats.valid_samples == 3


def test_data_leakage_detection_across_splits(tmp_path):
    """Verify that cross-split data leakage (train image in val/test) is flagged as critical error."""
    dataset_root = tmp_path / "iiit_leak_test"
    dataset_root.mkdir()
    create_synthetic_iiit_dataset(dataset_root)

    val_dir = dataset_root / "val"
    val_gt = val_dir / "val_gt.txt"

    # Leak train image into val GT
    with open(val_gt, "a", encoding="utf-8") as f:
        f.write("word_tr1.jpg ಕನ್ನಡ\n")
    # Place a copy or symlink in val images
    create_dummy_image(val_dir / "images" / "word_tr1.jpg")

    # If the relative paths are identical or resolve to overlapping references
    # Let's directly reference the train image from val_gt:
    with open(val_gt, "w", encoding="utf-8") as f:
        f.write("../train/images/word_tr1.jpg ಕನ್ನಡ\n")

    report = prepare_iiit_dataset(
        dataset_root=str(dataset_root),
        validate_only=True,
    )

    assert report.is_valid is False
    assert len(report.leakage_train_val) > 0
    assert any("leakage" in err.lower() or "overlap" in err.lower() for err in report.errors)


def test_audit_report_printing_and_json_export(tmp_path, capsys):
    """Verify terminal audit report formatting and JSON summary export."""
    dataset_root = tmp_path / "iiit_report_test"
    dataset_root.mkdir()
    create_synthetic_iiit_dataset(dataset_root)

    summary_file = tmp_path / "audit_summary.json"

    # Test CLI execution
    test_args = [
        "prepare_iiit_kannada_dataset.py",
        "--dataset-root",
        str(dataset_root),
        "--validate-only",
        "--summary-json",
        str(summary_file),
    ]

    orig_argv = sys.argv
    try:
        sys.argv = test_args
        ret = main()
        assert ret == 0
    finally:
        sys.argv = orig_argv

    captured = capsys.readouterr()
    assert "IIIT-INDIC-HW-WORDS Kannada Dataset Preparation & Audit Report" in captured.out
    assert "train" in captured.out
    assert "val" in captured.out
    assert "test" in captured.out
    assert "PASSED" in captured.out

    assert summary_file.exists()
    with open(summary_file, "r", encoding="utf-8") as f:
        data = json.load(f)
        assert data["is_valid"] is True
        assert "train" in data["splits"]
