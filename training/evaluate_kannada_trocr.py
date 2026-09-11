import os
import sys
import json
import logging
import argparse
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any, List, Tuple, Optional

from training.dataset import parse_manifest_file, KannadaOCRDataset

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("evaluate_kannada_trocr")


def compute_metrics_on_pairs(predictions: List[str], references: List[str]) -> Dict[str, float]:
    """Calculate character-level edit distance (CER) and Exact Match on held-out pairs."""
    from app.training.evaluator import compute_cer, compute_exact_match, compute_wer

    if not references:
        return {"cer": 0.0, "wer": 0.0, "exact_match": 0.0, "sample_count": 0}

    total_cer = sum(compute_cer(ref, pred) for ref, pred in zip(references, predictions)) / len(references)
    total_wer = sum(compute_wer(ref, pred) for ref, pred in zip(references, predictions)) / len(references)
    exact_matches = sum(compute_exact_match(ref, pred) for ref, pred in zip(references, predictions)) / len(references)

    return {
        "cer": round(total_cer, 4),
        "wer": round(total_wer, 4),
        "exact_match": round(exact_matches, 4),
        "sample_count": len(references),
    }


def evaluate_checkpoint(
    model_dir: str,
    test_manifest: str,
    tokenizer_dir: Optional[str] = None,
    dataset_root: str = "",
    batch_size: int = 4,
    output_report_path: Optional[str] = None,
    dry_run: bool = False,
) -> Dict[str, Any]:
    """Run OCR evaluation on a held-out test dataset."""
    logger.info(f"Evaluating Model:   {model_dir}")
    logger.info(f"Test Manifest:      {test_manifest}")

    if not Path(test_manifest).exists():
        raise FileNotFoundError(f"Test manifest not found: {test_manifest}")

    test_samples = parse_manifest_file(test_manifest, dataset_root=dataset_root)
    logger.info(f"Loaded {len(test_samples)} held-out test samples.")

    if dry_run:
        logger.info("[DRY-RUN] Manifest validated. Held-out test set verified.")
        return {
            "status": "MANIFEST_VERIFIED",
            "test_samples_count": len(test_samples),
            "model_path": model_dir,
        }

    try:
        import torch
        from PIL import Image
        from transformers import VisionEncoderDecoderModel, TrOCRProcessor, AutoTokenizer
    except ImportError as exc:
        logger.error("PyTorch/Transformers not installed. Install with: pip install -r training/requirements-train.txt")
        raise exc

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info(f"Loading checkpoint and processor onto device: {device}...")

    processor = TrOCRProcessor.from_pretrained(model_dir)
    if tokenizer_dir and Path(tokenizer_dir).exists():
        logger.info(f"Loading adapted tokenizer from {tokenizer_dir}...")
        processor.tokenizer = AutoTokenizer.from_pretrained(str(tokenizer_dir))

    model = VisionEncoderDecoderModel.from_pretrained(model_dir).to(device)
    model.eval()

    predictions = []
    references = []

    with torch.no_grad():
        for i in range(0, len(test_samples), batch_size):
            batch_samples = test_samples[i : i + batch_size]
            images = [Image.open(s.image_path).convert("RGB") for s in batch_samples]

            pixel_values = processor(images, return_tensors="pt").pixel_values.to(device)
            generated_ids = model.generate(pixel_values, max_length=64, num_beams=4)
            batch_preds = processor.batch_decode(generated_ids, skip_special_tokens=True)

            predictions.extend(batch_preds)
            references.extend([s.text for s in batch_samples])

    metrics = compute_metrics_on_pairs(predictions, references)
    logger.info(f"Results: CER={metrics['cer']*100:.2f}%, EM={metrics['exact_match']*100:.1f}%")

    report = {
        "model_dir": model_dir,
        "test_manifest": test_manifest,
        "evaluated_at": datetime.now(timezone.utc).isoformat(),
        "metrics": metrics,
        "device": str(device),
    }

    if output_report_path:
        out_p = Path(output_report_path)
        out_p.parent.mkdir(parents=True, exist_ok=True)
        with open(out_p, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2)
        logger.info(f"Evaluation report written to {output_report_path}")

    return report


def main():
    parser = argparse.ArgumentParser(description="Evaluate Kannada TrOCR checkpoint on held-out test set.")
    parser.add_argument("--model", type=str, required=True, help="Path to trained checkpoint directory")
    parser.add_argument("--manifest", type=str, required=True, help="Path to test set manifest (.json or .jsonl)")
    parser.add_argument("--tokenizer", type=str, default=None, help="Path to adapted tokenizer directory")
    parser.add_argument("--dataset-root", type=str, default="", help="Base directory for relative image paths")
    parser.add_argument("--batch-size", type=int, default=4, help="Inference batch size")
    parser.add_argument("--output", type=str, default=None, help="Path to save output JSON evaluation report")
    parser.add_argument("--dry-run", action="store_true", help="Validate test manifest without running inference")
    args = parser.parse_args()

    evaluate_checkpoint(
        model_dir=args.model,
        test_manifest=args.manifest,
        tokenizer_dir=args.tokenizer,
        dataset_root=args.dataset_root,
        batch_size=args.batch_size,
        output_report_path=args.output,
        dry_run=args.dry_run,
    )


if __name__ == "__main__":
    main()
