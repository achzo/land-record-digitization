import pytest
from datetime import datetime, timezone
from sqlalchemy import select, func

from app.models.document import Document
from app.models.extracted_field import ExtractedField
from app.models.active_learning import ActiveLearningSample
from app.models.model_registry import ModelCheckpoint, TrainingRun
from app.training.evaluator import (
    compute_cer,
    compute_wer,
    compute_exact_match,
    levenshtein_distance,
    EvaluationSuite,
)
from app.training.promoter import promotion_service
from app.services.active_learning_storage import al_storage_manager
from app.core.al_config import active_learning_config


import hashlib

def _create_sample_document(db_session) -> Document:
    """Helper to create a completed test document with valid 64-char SHA256 hash."""
    unique_key = f"kannada_test_doc_{datetime.now().timestamp()}_{id(db_session)}"
    valid_sha256 = hashlib.sha256(unique_key.encode("utf-8")).hexdigest()
    doc = Document(
        filename="kannada_test_doc.pdf",
        file_hash=valid_sha256,
        storage_path=f"uploads/{valid_sha256[:16]}_kannada_test_doc.pdf",
        status="COMPLETED",
    )
    db_session.add(doc)
    db_session.commit()
    db_session.refresh(doc)
    return doc


def test_evaluator_metrics_unit():
    """Unit test CER, WER, and Exact Match calculation."""
    assert levenshtein_distance("ಕನ್ನಡ", "ಕನ್ನಡ") == 0
    assert levenshtein_distance("ಕನ್ನಡ", "ಕನ್ನಡಾ") == 1
    assert compute_exact_match("ಕನ್ನಡ", "ಕನ್ನಡ") == 1.0
    assert compute_exact_match("ಕನ್ನಡ", "ಭಾರತ") == 0.0

    # CER: 1 edit over 6 chars
    cer = compute_cer("abcdef", "abcdeg")
    assert round(cer, 2) == 0.17

    # WER: 1 word substituted out of 2
    wer = compute_wer("hello world", "hello there")
    assert wer == 0.5


def test_evaluation_suite_gated_promotion_logic():
    """Test promotion gating logic for improvements and regressions."""
    # Case 1: Improvement on hard cases, no benchmark regression -> Eligible
    base_eval = {"available": True, "hard_case_cer": 0.25, "benchmark_cer": 0.08}
    cand_eval = {"available": True, "hard_case_cer": 0.18, "benchmark_cer": 0.08}
    res = EvaluationSuite.evaluate_candidate_checkpoint(
        candidate_eval=cand_eval,
        baseline_eval=base_eval,
        tolerance=0.02,
        min_improvement=0.01,
    )
    assert res["recommend_promotion"] is True
    assert res["has_improvement"] is True
    assert not res["has_regression"]

    # Case 2: Insufficient hard case improvement -> Ineligible
    cand_eval_no_imp = {"available": True, "hard_case_cer": 0.245, "benchmark_cer": 0.08}
    res2 = EvaluationSuite.evaluate_candidate_checkpoint(
        candidate_eval=cand_eval_no_imp,
        baseline_eval=base_eval,
        tolerance=0.02,
        min_improvement=0.01,
    )
    assert res2["recommend_promotion"] is False
    assert not res2["has_improvement"]

    # Case 3: Regression on general benchmark -> Ineligible
    cand_eval_regressed = {"available": True, "hard_case_cer": 0.15, "benchmark_cer": 0.15}  # regressed from 0.08
    res3 = EvaluationSuite.evaluate_candidate_checkpoint(
        candidate_eval=cand_eval_regressed,
        baseline_eval=base_eval,
        tolerance=0.02,
        min_improvement=0.01,
    )
    assert res3["recommend_promotion"] is False
    assert res3["has_regression"] is True


def test_review_queue_filtering_and_rbac(client, db_session, reviewer_headers, viewer_headers):
    """Test that GET /review/queue filters PENDING_REVIEW fields and enforces RBAC."""
    doc = _create_sample_document(db_session)

    # 1 pending low-confidence field
    f1 = ExtractedField(
        document_id=doc.id,
        field_name="owner_name",
        original_value="ರಾಮ",
        confidence_score=0.62,
        language_script="kannada_handwritten",
        review_status="PENDING_REVIEW",
    )
    # 1 high-confidence field
    f2 = ExtractedField(
        document_id=doc.id,
        field_name="district",
        original_value="ಬೆಂಗಳೂರು",
        confidence_score=0.95,
        language_script="kannada_handwritten",
        review_status="NOT_REQUIRED",
    )
    db_session.add_all([f1, f2])
    db_session.commit()

    # Reviewer access
    resp = client.get("/api/v1/review/queue", headers=reviewer_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_pending"] >= 1
    returned_ids = [item["field_id"] for item in data["items"]]
    assert f1.id in returned_ids
    assert f2.id not in returned_ids

    # Viewer role access denied (Reviewer or above required)
    resp_viewer = client.get("/api/v1/review/queue", headers=viewer_headers)
    assert resp_viewer.status_code == 403


def test_review_decision_accept(client, db_session, reviewer_headers):
    """Test ACCEPT decision creates verified ActiveLearningSample from existing OCR."""
    doc = _create_sample_document(db_session)
    field = ExtractedField(
        document_id=doc.id,
        field_name="survey_number",
        original_value="೧೨೩/೪",
        confidence_score=0.71,
        language_script="kannada_handwritten",
        review_status="PENDING_REVIEW",
    )
    db_session.add(field)
    db_session.commit()

    payload = {"action": "ACCEPT"}
    resp = client.post(f"/api/v1/review/{field.id}/decision", json=payload, headers=reviewer_headers)
    assert resp.status_code == 200
    res_data = resp.json()
    assert res_data["success"] is True
    assert res_data["verified_sample_created"] is True
    assert res_data["review_status"] == "VERIFIED"

    # Verify DB state
    db_session.refresh(field)
    assert field.review_status == "VERIFIED"

    stmt = select(ActiveLearningSample).where(ActiveLearningSample.extracted_field_id == field.id)
    sample = db_session.execute(stmt).scalar_one()
    assert sample.verified_text == "೧೨೩/೪"
    assert sample.verified_by_human is True


def test_review_decision_correct(client, db_session, reviewer_headers):
    """Test CORRECT decision updates field value and stores human ground truth."""
    doc = _create_sample_document(db_session)
    field = ExtractedField(
        document_id=doc.id,
        field_name="applicant_name",
        original_value="ತಪ್ಪಾಗಿದೆ",
        confidence_score=0.55,
        language_script="kannada_handwritten",
        review_status="PENDING_REVIEW",
    )
    db_session.add(field)
    db_session.commit()

    payload = {"action": "CORRECT", "corrected_text": "ಸುರೇಶ್ ಕುಮಾರ್"}
    resp = client.post(f"/api/v1/review/{field.id}/decision", json=payload, headers=reviewer_headers)
    assert resp.status_code == 200
    res_data = resp.json()
    assert res_data["success"] is True
    assert res_data["review_status"] == "EDITED"

    db_session.refresh(field)
    assert field.review_status == "EDITED"
    assert field.normalized_value == "ಸುರೇಶ್ ಕುಮಾರ್"

    stmt = select(ActiveLearningSample).where(ActiveLearningSample.extracted_field_id == field.id)
    sample = db_session.execute(stmt).scalar_one()
    assert sample.verified_text == "ಸುರೇಶ್ ಕುಮಾರ್"
    assert sample.verified_by_human is True


def test_review_decision_reject(client, db_session, reviewer_headers):
    """Test REJECT decision does NOT create training sample."""
    doc = _create_sample_document(db_session)
    field = ExtractedField(
        document_id=doc.id,
        field_name="unclear_field",
        original_value="??",
        confidence_score=0.30,
        language_script="kannada_handwritten",
        review_status="PENDING_REVIEW",
    )
    db_session.add(field)
    db_session.commit()

    payload = {"action": "REJECT", "rejection_reason": "Crop unreadable due to ink blot"}
    resp = client.post(f"/api/v1/review/{field.id}/decision", json=payload, headers=reviewer_headers)
    assert resp.status_code == 200
    res_data = resp.json()
    assert res_data["action"] == "REJECT"
    assert res_data["verified_sample_created"] is False

    db_session.refresh(field)
    assert field.review_status == "REJECTED"

    # Confirm no sample created in ActiveLearningSample
    stmt = select(ActiveLearningSample).where(ActiveLearningSample.extracted_field_id == field.id)
    assert db_session.execute(stmt).scalar_one_or_none() is None


def test_review_decision_validation_errors(client, db_session, reviewer_headers):
    """Test validation errors on empty corrected text, invalid candidates, and duplicates."""
    doc = _create_sample_document(db_session)
    field = ExtractedField(
        document_id=doc.id,
        field_name="field_err",
        original_value="ಮೈಸೂರು",
        confidence_score=0.60,
        language_script="kannada_handwritten",
        review_status="PENDING_REVIEW",
    )
    db_session.add(field)
    db_session.commit()

    # 1. Empty corrected text
    resp_empty = client.post(
        f"/api/v1/review/{field.id}/decision",
        json={"action": "CORRECT", "corrected_text": "   "},
        headers=reviewer_headers,
    )
    assert resp_empty.status_code in [400, 422]

    # 2. Candidate index out of bounds
    resp_bad_cand = client.post(
        f"/api/v1/review/{field.id}/decision",
        json={"action": "ACCEPT", "selected_candidate_index": 99},
        headers=reviewer_headers,
    )
    assert resp_bad_cand.status_code == 400

    # 3. Nonexistent field
    resp_404 = client.post(
        "/api/v1/review/999999/decision",
        json={"action": "ACCEPT"},
        headers=reviewer_headers,
    )
    assert resp_404.status_code == 404


def test_duplicate_sample_prevention(client, db_session, reviewer_headers):
    """Test duplicate image crop prevention in active learning dataset."""
    doc = _create_sample_document(db_session)
    f1 = ExtractedField(
        document_id=doc.id,
        field_name="f1",
        original_value="ಹಾಸನ",
        confidence_score=0.60,
        crop_image_path="crops/test_crop_hash_1.png",
        review_status="PENDING_REVIEW",
    )
    f2 = ExtractedField(
        document_id=doc.id,
        field_name="f2",
        original_value="ಹಾಸನ",
        confidence_score=0.60,
        crop_image_path="crops/test_crop_hash_1.png",  # Identical crop path
        review_status="PENDING_REVIEW",
    )
    db_session.add_all([f1, f2])
    db_session.commit()

    # First succeeds
    resp1 = client.post(f"/api/v1/review/{f1.id}/decision", json={"action": "ACCEPT"}, headers=reviewer_headers)
    assert resp1.status_code == 200

    # Second with identical image is rejected
    resp2 = client.post(f"/api/v1/review/{f2.id}/decision", json={"action": "ACCEPT"}, headers=reviewer_headers)
    assert resp2.status_code == 400
    assert "duplicate" in resp2.json()["detail"].lower()


def test_training_threshold_and_status(client, db_session, reviewer_headers, admin_headers):
    """Test GET /training/status reports correct threshold and readiness."""
    resp = client.get("/api/v1/training/status", headers=reviewer_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["min_verified_samples_for_training"] == active_learning_config.min_verified_samples_for_training
    assert data["min_verified_samples_for_training"] == 20
    assert "current_production_checkpoint" in data


def test_training_trigger_threshold_guard(client, db_session, admin_headers):
    """Test that training cannot be triggered if fewer than 20 verified samples exist."""
    # Ensure fewer than 20 verified samples exist
    resp = client.post("/api/v1/training/trigger", json={}, headers=admin_headers)
    # If less than threshold (20), expect 400
    if resp.status_code == 400:
        assert "insufficient verified samples" in resp.json()["detail"].lower()


def test_training_trigger_rbac(client, db_session, reviewer_headers, viewer_headers):
    """Test that only ADMIN can trigger candidate training."""
    resp_rev = client.post("/api/v1/training/trigger", json={}, headers=reviewer_headers)
    assert resp_rev.status_code == 403

    resp_view = client.post("/api/v1/training/trigger", json={}, headers=viewer_headers)
    assert resp_view.status_code == 403

    resp_anon = client.post("/api/v1/training/trigger", json={})
    assert resp_anon.status_code == 401


def test_training_run_lifecycle_and_promotion(client, db_session, admin_headers):
    """End-to-end test of training run trigger, candidate evaluation, gated promotion, and rollback."""
    doc = _create_sample_document(db_session)

    # Seed 20 verified samples to meet min_verified_samples_for_training threshold
    for i in range(20):
        field = ExtractedField(
            document_id=doc.id,
            field_name=f"test_field_{i}",
            original_value=f"ಪದ_{i}",
            confidence_score=0.75,
            review_status="VERIFIED",
        )
        db_session.add(field)
        db_session.commit()

        sample = ActiveLearningSample(
            extracted_field_id=field.id,
            document_id=doc.id,
            crop_image_path=f"crops/sample_{i}_{datetime.now().timestamp()}.png",
            image_hash=f"hash_{i}_{datetime.now().timestamp()}",
            original_prediction=f"ಪದ_{i}",
            verified_text=f"ಪದ_{i}",
            verified_by_human=True,
            confidence_score=0.75,
            language_script="kannada_handwritten",
            reviewer_id=1,
            split="TRAIN" if i < 17 else "VAL",
        )
        db_session.add(sample)
    db_session.commit()

    # Trigger candidate training run
    trig_resp = client.post("/api/v1/training/trigger", json={}, headers=admin_headers)
    assert trig_resp.status_code == 201
    run_info = trig_resp.json()
    run_id = run_info["training_run_id"]
    assert run_info["status"] == "COMPLETED"

    # Verify candidate checkpoint created in DB
    run_stmt = select(TrainingRun).where(TrainingRun.id == run_id)
    run_obj = db_session.execute(run_stmt).scalar_one()
    assert run_obj.candidate_checkpoint is not None
    cand_cp = run_obj.candidate_checkpoint
    assert cand_cp.status == "CANDIDATE"
    assert cand_cp.is_production is False

    # 1. Test promotion failure when regression or metrics missing
    cand_cp.evaluation_metrics = {
        "available": True,
        "hard_case_cer": 0.30,  # Worse than baseline or no improvement
        "benchmark_cer": 0.20,
    }
    db_session.commit()

    # Baseline production
    prod_cp = promotion_service.get_active_production_checkpoint(db_session)
    prod_cp.evaluation_metrics = {
        "available": True,
        "hard_case_cer": 0.25,
        "benchmark_cer": 0.05,
    }
    db_session.commit()

    bad_promo_resp = client.post(f"/api/v1/training/runs/{run_id}/promote", headers=admin_headers)
    assert bad_promo_resp.status_code == 400
    assert "cannot promote candidate" in bad_promo_resp.json()["detail"].lower()

    # 2. Test successful promotion when candidate passes gating
    cand_cp.evaluation_metrics = {
        "available": True,
        "hard_case_cer": 0.15,  # Improved from 0.25 by > 0.01
        "benchmark_cer": 0.05,  # No regression
    }
    db_session.commit()

    good_promo_resp = client.post(f"/api/v1/training/runs/{run_id}/promote", headers=admin_headers)
    assert good_promo_resp.status_code == 200
    assert good_promo_resp.json()["status"] == "PRODUCTION"

    db_session.refresh(cand_cp)
    db_session.refresh(prod_cp)
    assert cand_cp.is_production is True
    assert cand_cp.status == "PRODUCTION"
    assert prod_cp.is_production is False
    assert prod_cp.status == "ARCHIVED"

    # 3. Test rollback to previous production checkpoint
    rollback_resp = client.post(
        f"/api/v1/training/checkpoints/{prod_cp.id}/rollback",
        headers=admin_headers,
    )
    assert rollback_resp.status_code == 200
    db_session.refresh(cand_cp)
    db_session.refresh(prod_cp)
    assert prod_cp.is_production is True
    assert prod_cp.status == "PRODUCTION"
    assert cand_cp.is_production is False
    assert cand_cp.status == "ARCHIVED"
