from typing import List, Dict, Any, Optional, Tuple


def levenshtein_distance(s1: str, s2: str) -> int:
    """Compute character-level edit distance between two strings."""
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)

    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row

    return previous_row[-1]


def compute_cer(reference: str, hypothesis: str) -> float:
    """Character Error Rate = Levenshtein Distance / Reference Length."""
    ref = reference.strip()
    hyp = hypothesis.strip()
    if not ref:
        return 0.0 if not hyp else 1.0
    dist = levenshtein_distance(ref, hyp)
    return round(dist / len(ref), 4)


def compute_wer(reference: str, hypothesis: str) -> float:
    """Word Error Rate = Word Edit Distance / Reference Word Count."""
    ref_words = reference.strip().split()
    hyp_words = hypothesis.strip().split()
    if not ref_words:
        return 0.0 if not hyp_words else 1.0

    # Word-level edit distance
    d = [[0] * (len(hyp_words) + 1) for _ in range(len(ref_words) + 1)]
    for i in range(len(ref_words) + 1):
        d[i][0] = i
    for j in range(len(hyp_words) + 1):
        d[0][j] = j

    for i in range(1, len(ref_words) + 1):
        for j in range(1, len(hyp_words) + 1):
            cost = 0 if ref_words[i - 1] == hyp_words[j - 1] else 1
            d[i][j] = min(
                d[i - 1][j] + 1,        # deletion
                d[i][j - 1] + 1,        # insertion
                d[i - 1][j - 1] + cost, # substitution
            )

    return round(d[len(ref_words)][len(hyp_words)] / len(ref_words), 4)


def compute_exact_match(reference: str, hypothesis: str) -> float:
    """Exact Match (1.0 if perfectly identical, 0.0 otherwise)."""
    return 1.0 if reference.strip() == hypothesis.strip() else 0.0


class EvaluationSuite:
    """Evaluation framework for Kannada OCR checkpoints.

    Supports:
      - Character Error Rate (CER)
      - Word Error Rate (WER)
      - Exact Match (EM)
      - Average Confidence
      - Human-Review Rate
    """

    @classmethod
    def evaluate_predictions(
        cls,
        dataset: List[Tuple[str, str]],  # List of (ground_truth, predicted_text)
        confidences: Optional[List[float]] = None,
        confidence_threshold: float = 0.80,
    ) -> Dict[str, Any]:
        """Evaluate a list of ground-truth vs hypothesis predictions."""
        if not dataset:
            return {
                "available": False,
                "message": "Dataset is empty; evaluation metrics unavailable.",
            }

        total_cer = sum(compute_cer(gt, hyp) for gt, hyp in dataset) / len(dataset)
        total_wer = sum(compute_wer(gt, hyp) for gt, hyp in dataset) / len(dataset)
        exact_matches = sum(compute_exact_match(gt, hyp) for gt, hyp in dataset) / len(dataset)

        avg_conf = (sum(confidences) / len(confidences)) if confidences else 0.0
        review_rate = (
            sum(1 for c in confidences if c < confidence_threshold) / len(confidences)
            if confidences
            else 0.0
        )

        return {
            "available": True,
            "sample_count": len(dataset),
            "cer": round(total_cer, 4),
            "wer": round(total_wer, 4),
            "exact_match": round(exact_matches, 4),
            "avg_confidence": round(avg_conf, 4),
            "human_review_rate": round(review_rate, 4),
        }

    @classmethod
    def evaluate_candidate_checkpoint(
        cls,
        candidate_eval: Dict[str, Any],
        baseline_eval: Dict[str, Any],
        tolerance: float = 0.02,
        min_improvement: float = 0.01,
    ) -> Dict[str, Any]:
        """Check promotion gate:

        Rules:
        1. Hard-case CER must improve (lower than baseline by at least min_improvement).
        2. Benchmark CER must not regress beyond configured tolerance.
        3. Both evaluation datasets must actually be available and evaluated.
        """
        cand_avail = candidate_eval.get("available", False)
        base_avail = baseline_eval.get("available", False)

        if not cand_avail or not base_avail:
            return {
                "available": False,
                "recommend_promotion": False,
                "message": "Required evaluation datasets were not actually evaluated or are not configured.",
                "reasons": ["Evaluation metrics unavailable; real benchmark dataset missing."],
            }

        cand_hard_cer = candidate_eval.get("hard_case_cer", candidate_eval.get("cer", 1.0))
        base_hard_cer = baseline_eval.get("hard_case_cer", baseline_eval.get("cer", 1.0))

        cand_bench_cer = candidate_eval.get("benchmark_cer", candidate_eval.get("cer", 1.0))
        base_bench_cer = baseline_eval.get("benchmark_cer", baseline_eval.get("cer", 1.0))

        improvement = round(base_hard_cer - cand_hard_cer, 4)
        has_improvement = improvement >= min_improvement

        regression = round(cand_bench_cer - base_bench_cer, 4)
        has_regression = regression > tolerance

        reasons = []
        if not has_improvement:
            reasons.append(f"No significant hard-case improvement: delta={improvement:.4f} (requires >= {min_improvement})")
        if has_regression:
            reasons.append(f"Regression detected on benchmark: regression delta={regression:.4f} exceeds tolerance {tolerance}")

        recommend_promotion = has_improvement and not has_regression

        return {
            "available": True,
            "recommend_promotion": recommend_promotion,
            "has_improvement": has_improvement,
            "has_regression": has_regression,
            "hard_case_cer_delta": improvement,
            "benchmark_cer_delta": regression,
            "reasons": reasons if not recommend_promotion else ["Candidate improves on hard cases without general benchmark regression."],
        }
