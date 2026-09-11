import os
import sys
import json
import logging
import argparse
from pathlib import Path
from typing import Dict, Any, List, Optional

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("infer_kannada_trocr")


def run_inference(
    image_path: str,
    model_dir: str,
    tokenizer_dir: Optional[str] = None,
    num_beams: int = 5,
    max_length: int = 64,
) -> Dict[str, Any]:
    """Perform Kannada handwriting OCR inference on a single image crop.

    Returns:
    - prediction: Best recognized Kannada text
    - confidence: Estimated confidence score
    - candidates: Alternative beam search hypotheses with relative scores
    """
    img_path = Path(image_path)
    if not img_path.exists():
        raise FileNotFoundError(f"Image not found: {img_path}")

    model_path = Path(model_dir)
    if not model_path.exists():
        raise FileNotFoundError(f"Model checkpoint directory not found: {model_path}")

    try:
        import torch
        from PIL import Image
        from transformers import VisionEncoderDecoderModel, TrOCRProcessor, AutoTokenizer
    except ImportError as exc:
        logger.error("PyTorch and Transformers are required for inference. Install with: pip install -r training/requirements-train.txt")
        raise exc

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info(f"Loading processor and model from {model_dir} onto {device}...")

    processor = TrOCRProcessor.from_pretrained(model_dir)
    if tokenizer_dir and Path(tokenizer_dir).exists():
        logger.info(f"Loading adapted tokenizer from {tokenizer_dir}...")
        processor.tokenizer = AutoTokenizer.from_pretrained(str(tokenizer_dir))

    model = VisionEncoderDecoderModel.from_pretrained(model_dir).to(device)
    model.eval()

    # Load and preprocess image
    image = Image.open(img_path).convert("RGB")
    pixel_values = processor(image, return_tensors="pt").pixel_values.to(device)

    # Generate with beam search
    with torch.no_grad():
        outputs = model.generate(
            pixel_values,
            num_beams=num_beams,
            num_return_sequences=min(num_beams, 5),
            max_length=max_length,
            early_stopping=True,
            return_dict_in_generate=True,
            output_scores=True,
        )

    # Decode sequences
    decoded_sequences = processor.batch_decode(outputs.sequences, skip_special_tokens=True)
    primary_prediction = decoded_sequences[0] if decoded_sequences else ""

    # Compute normalized candidate scores if beam search scores are available
    candidates = []
    if hasattr(outputs, "sequences_scores") and outputs.sequences_scores is not None:
        # Convert log-likelihood to approximate confidence probabilities via softmax
        probs = torch.softmax(outputs.sequences_scores, dim=0).cpu().tolist()
        for text, score in zip(decoded_sequences, probs):
            candidates.append({"text": text.strip(), "score": round(score, 4)})
        primary_confidence = candidates[0]["score"] if candidates else 0.85
    else:
        for idx, text in enumerate(decoded_sequences):
            candidates.append({"text": text.strip(), "score": round(1.0 - (idx * 0.15), 2)})
        primary_confidence = 0.85

    result = {
        "image_path": str(img_path),
        "model_version": model_path.name,
        "prediction": primary_prediction.strip(),
        "confidence": round(primary_confidence, 4),
        "candidates": candidates,
    }

    return result


def main():
    parser = argparse.ArgumentParser(description="Run Kannada handwriting OCR inference on an image crop.")
    parser.add_argument("--image", type=str, required=True, help="Path to input crop image (.png, .jpg)")
    parser.add_argument("--model", type=str, required=True, help="Path to trained model checkpoint directory")
    parser.add_argument("--tokenizer", type=str, default=None, help="Path to adapted tokenizer directory")
    parser.add_argument("--num-beams", type=int, default=5, help="Number of beam search candidates")
    parser.add_argument("--json", action="store_true", help="Output results strictly as formatted JSON")
    args = parser.parse_args()

    try:
        res = run_inference(
            image_path=args.image,
            model_dir=args.model,
            tokenizer_dir=args.tokenizer,
            num_beams=args.num_beams,
        )
        if args.json:
            print(json.dumps(res, indent=2, ensure_ascii=False))
        else:
            print("\n" + "=" * 60)
            print("KANNADA HANDWRITING OCR RESULT")
            print("=" * 60)
            print(f"Image:       {res['image_path']}")
            print(f"Model:       {res['model_version']}")
            print(f"Prediction:  {res['prediction']}")
            print(f"Confidence:  {res['confidence'] * 100:.1f}%")
            if res.get("candidates"):
                print("Candidates:")
                for c in res["candidates"]:
                    print(f"  - {c['text']} ({c['score'] * 100:.1f}%)")
            print("=" * 60)
    except Exception as exc:
        logger.error(f"Inference failed: {exc}")
        sys.exit(1)


if __name__ == "__main__":
    main()
