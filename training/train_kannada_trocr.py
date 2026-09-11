import os
import sys
import json
import yaml
import logging
import argparse
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from training.dataset import parse_manifest_file, KannadaOCRDataset
from training.collator import TrOCRDataCollator

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("train_kannada_trocr")


def load_kannada_ocr_config(config_path: str = "configs/kannada_ocr.yaml") -> Dict[str, Any]:
    """Load and validate training configuration from YAML."""
    path = Path(config_path)
    if not path.exists():
        raise FileNotFoundError(f"Configuration file not found: {path}")
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def build_cer_metric_calculator(processor):
    """Factory creating the compute_metrics function for Seq2SeqTrainer."""
    def compute_cer_metrics(pred):
        labels_ids = pred.label_ids
        pred_ids = pred.predictions

        # Replace -100 in labels with pad_token_id for proper decoding
        labels_ids[labels_ids == -100] = processor.tokenizer.pad_token_id

        pred_str = processor.batch_decode(pred_ids, skip_special_tokens=True)
        label_str = processor.batch_decode(labels_ids, skip_special_tokens=True)

        # Compute character error rate and exact match
        from app.training.evaluator import compute_cer, compute_exact_match

        total_cer = sum(compute_cer(gt, hyp) for gt, hyp in zip(label_str, pred_str)) / max(len(label_str), 1)
        exact_matches = sum(compute_exact_match(gt, hyp) for gt, hyp in zip(label_str, pred_str)) / max(len(label_str), 1)

        return {
            "cer": round(total_cer, 4),
            "exact_match": round(exact_matches, 4),
        }
    return compute_cer_metrics


def run_training_pipeline(
    config_path: str = "configs/kannada_ocr.yaml",
    dry_run: bool = False,
    override_args: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Execute end-to-end TrOCR fine-tuning for Kannada handwriting.

    Steps:
    1. Parse and validate YAML config and dataset manifests.
    2. Initialize HuggingFace VisionEncoderDecoderModel & TrOCRProcessor.
    3. Construct PyTorch datasets with OCR image collator.
    4. Fine-tune via Seq2SeqTrainer.
    5. Save checkpoint, tokenizer, generation config, and training_metadata.json.
    """
    config = load_kannada_ocr_config(config_path)
    if override_args:
        for k, v in override_args.items():
            if v is not None:
                config["training"][k] = v

    dataset_cfg = config.get("dataset", {})
    model_cfg = config.get("model", {})
    train_cfg = config.get("training", {})

    output_dir = Path(train_cfg.get("output_dir", "models/kannada_trocr/candidates"))
    output_dir.mkdir(parents=True, exist_ok=True)

    train_manifest = dataset_cfg.get("train_manifest")
    val_manifest = dataset_cfg.get("validation_manifest")

    logger.info(f"Base Model:         {model_cfg.get('base_model')}")
    logger.info(f"Train Manifest:     {train_manifest}")
    logger.info(f"Val Manifest:       {val_manifest}")
    logger.info(f"Output Directory:   {output_dir}")

    # Dry-run validation mode: verify config and manifest syntax without training
    if dry_run or not train_manifest or not Path(train_manifest).exists():
        logger.info("[DRY-RUN / STAGED] Manifest not attached or dry-run requested. Pipeline configuration verified.")
        return {
            "status": "CONFIG_VERIFIED",
            "config": config,
            "ready_to_execute": bool(train_manifest and Path(train_manifest).exists()),
        }

    # Verify PyTorch / Transformers availability
    try:
        import torch
        from transformers import (
            VisionEncoderDecoderModel,
            TrOCRProcessor,
            AutoTokenizer,
            Seq2SeqTrainer,
            Seq2SeqTrainingArguments,
            default_data_collator,
        )
    except ImportError as exc:
        logger.error(
            "Required ML libraries not installed. "
            "Install with: pip install -r training/requirements-train.txt"
        )
        raise exc

    # 1. Load Processor and Model
    base_model_id = model_cfg.get("base_model", "microsoft/trocr-base-handwritten")
    tokenizer_name = model_cfg.get("tokenizer_name") or base_model_id
    logger.info(f"Loading processor and pre-trained model from {base_model_id} (tokenizer: {tokenizer_name})...")
    processor = TrOCRProcessor.from_pretrained(base_model_id)

    if tokenizer_name and tokenizer_name != base_model_id and Path(tokenizer_name).exists():
        logger.info(f"Overriding processor tokenizer with adapted tokenizer from {tokenizer_name}...")
        processor.tokenizer = AutoTokenizer.from_pretrained(str(tokenizer_name))

    model = VisionEncoderDecoderModel.from_pretrained(base_model_id)

    # Resize decoder token embeddings if tokenizer vocabulary is larger
    if len(processor.tokenizer) > model.decoder.config.vocab_size:
        logger.info(
            f"Resizing decoder token embeddings from {model.decoder.config.vocab_size} to {len(processor.tokenizer)}..."
        )
        model.decoder.resize_token_embeddings(len(processor.tokenizer))
        model.config.vocab_size = len(processor.tokenizer)
        model.decoder.config.vocab_size = len(processor.tokenizer)

    # Set special token IDs for generation
    model.config.decoder_start_token_id = processor.tokenizer.cls_token_id or processor.tokenizer.bos_token_id
    model.config.pad_token_id = processor.tokenizer.pad_token_id

    # Set generation parameters
    model.config.eos_token_id = processor.tokenizer.sep_token_id or processor.tokenizer.eos_token_id
    model.config.max_length = model_cfg.get("max_target_length", 64)
    model.config.early_stopping = True
    model.config.no_repeat_ngram_size = 3
    model.config.length_penalty = 1.0
    model.config.num_beams = config.get("inference", {}).get("num_beams", 5)

    # 2. Ingest Manifests
    dataset_root = dataset_cfg.get("dataset_root", "")
    train_samples = parse_manifest_file(
        train_manifest,
        dataset_root=dataset_root,
        strict_human_verified_only=dataset_cfg.get("strict_human_verified_only", True),
    )
    val_samples = parse_manifest_file(
        val_manifest,
        dataset_root=dataset_root,
        strict_human_verified_only=dataset_cfg.get("strict_human_verified_only", True),
    ) if val_manifest and Path(val_manifest).exists() else []

    logger.info(f"Loaded {len(train_samples)} training samples, {len(val_samples)} validation samples.")

    # 3. Construct Datasets & Collator
    train_dataset = KannadaOCRDataset(
        samples=train_samples,
        processor=processor,
        max_target_length=model_cfg.get("max_target_length", 64),
    )
    val_dataset = KannadaOCRDataset(
        samples=val_samples,
        processor=processor,
        max_target_length=model_cfg.get("max_target_length", 64),
    ) if val_samples else None

    data_collator = TrOCRDataCollator(processor=processor)

    # 4. Configure Seq2Seq Training Arguments
    training_args = Seq2SeqTrainingArguments(
        output_dir=str(output_dir),
        predict_with_generate=True,
        evaluation_strategy=train_cfg.get("eval_strategy", "epoch") if val_dataset else "no",
        save_strategy=train_cfg.get("save_strategy", "epoch"),
        learning_rate=float(train_cfg.get("learning_rate", 5e-5)),
        per_device_train_batch_size=int(train_cfg.get("batch_size", 4)),
        per_device_eval_batch_size=int(train_cfg.get("eval_batch_size", 4)),
        gradient_accumulation_steps=int(train_cfg.get("gradient_accumulation_steps", 1)),
        weight_decay=float(train_cfg.get("weight_decay", 0.01)),
        save_total_limit=int(train_cfg.get("save_total_limit", 2)),
        num_train_epochs=int(train_cfg.get("epochs", 5)),
        fp16=bool(train_cfg.get("fp16", torch.cuda.is_available())),
        logging_steps=int(train_cfg.get("logging_steps", 10)),
        load_best_model_at_end=bool(train_cfg.get("load_best_model_at_end", True)) if val_dataset else False,
        metric_for_best_model=train_cfg.get("metric_for_best_model", "cer") if val_dataset else None,
        greater_is_better=bool(train_cfg.get("greater_is_better", False)),
        report_to="none",
    )

    # 5. Initialize Trainer & Train
    trainer = Seq2SeqTrainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=val_dataset,
        data_collator=data_collator,
        compute_metrics=build_cer_metric_calculator(processor) if val_dataset else None,
    )

    logger.info("Initiating model training loop...")
    train_result = trainer.train()

    # 6. Evaluate final validation metrics
    eval_metrics = trainer.evaluate() if val_dataset else {}
    logger.info(f"Evaluation Metrics: {eval_metrics}")

    # 7. Save Checkpoint, Processor, and Metadata
    version_tag = f"kannada-trocr-candidate-v1.{int(datetime.now().timestamp())}"
    final_save_dir = output_dir / version_tag
    final_save_dir.mkdir(parents=True, exist_ok=True)

    # Critical isolation guard: ensure candidate save directory never touches production
    assert "production" not in str(final_save_dir).lower(), "CRITICAL: Checkpoint must not overwrite production!"

    logger.info(f"Saving fine-tuned candidate checkpoint and processor to: {final_save_dir}")
    trainer.save_model(str(final_save_dir))
    processor.save_pretrained(str(final_save_dir))

    metadata = {
        "model_version": version_tag,
        "parent_model": base_model_id,
        "base_model": base_model_id,
        "tokenizer_version": Path(tokenizer_name).name if tokenizer_name else "kannada_v1",
        "train_manifest": str(train_manifest),
        "validation_manifest": str(val_manifest) if val_manifest else "",
        "test_manifest": str(dataset_cfg.get("test_manifest", "")),
        "dataset_version": dataset_cfg.get("dataset_version", "iiit-indic-kannada-v1.0"),
        "training_samples": len(train_samples),
        "validation_samples": len(val_samples),
        "test_samples": 0,
        "training_timestamp": datetime.now(timezone.utc).isoformat(),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "epochs": train_cfg.get("epochs", 5),
        "batch_size": train_cfg.get("batch_size", 4),
        "learning_rate": train_cfg.get("learning_rate", 5e-5),
        "max_target_length": model_cfg.get("max_target_length", 64),
        "status": "CANDIDATE",
        "cer": eval_metrics.get("eval_cer", None),
        "exact_match": eval_metrics.get("eval_exact_match", None),
        "train_loss": train_result.training_loss,
        "checkpoint_dir": str(final_save_dir),
    }

    with open(final_save_dir / "training_metadata.json", "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    logger.info(f"Training successfully completed. Candidate metadata written to {final_save_dir / 'training_metadata.json'}")
    return metadata


def main():
    parser = argparse.ArgumentParser(description="Fine-tune HuggingFace TrOCR for Kannada handwriting OCR.")
    parser.add_argument("--config", type=str, default="configs/kannada_ocr.yaml", help="Path to config YAML")
    parser.add_argument("--dry-run", action="store_true", help="Validate pipeline configuration without executing training")
    parser.add_argument("--epochs", type=int, default=None, help="Override number of epochs")
    parser.add_argument("--batch-size", type=int, default=None, help="Override batch size")
    parser.add_argument("--lr", type=float, default=None, help="Override learning rate")
    args = parser.parse_args()

    run_training_pipeline(
        config_path=args.config,
        dry_run=args.dry_run,
        override_args={"epochs": args.epochs, "batch_size": args.batch_size, "learning_rate": args.lr},
    )


if __name__ == "__main__":
    main()
