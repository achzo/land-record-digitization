import {
  DocumentItem,
  DocumentUploadResponse,
  DocumentStatusResponse,
  ExtractedFieldsSummary,
  ExtractionResult,
  DocumentSearchResponse,
  ReviewQueueResponse,
  ReviewDecisionRequest,
  ReviewDecisionResponse,
  ReviewStatsResponse,
  TrainingStatusResponse,
  TrainingRunItem,
  EvaluationResponse,
  PromotionResponse,
  LandRecord,
  LandRecordSearchQuery,
  ExtractedLandField,
  TrackingApplication,
  VerificationCheckResult,
} from "./types";
import {
  MOCK_LAND_RECORDS,
  MOCK_EXTRACTED_LAND_FIELDS,
  MOCK_TRACKING_APPLICATIONS,
  MOCK_VERIFICATION_LOOKUP,
} from "./mock-data";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_V1 = `${API_BASE}/api/v1`;

// ==============================================================================
// 1. BHUMIAI LAND RECORDS PROTOTYPE API LAYER
// ==============================================================================

/**
 * Search official land records by survey number, property ID, or owner name.
 * TODO: Replace mock implementation with FastAPI endpoint: GET /api/v1/land-records/search
 */
export async function searchLandRecords(
  params: LandRecordSearchQuery
): Promise<LandRecord[]> {
  // Simulate 200ms network latency for realistic UX
  await new Promise((res) => setTimeout(res, 200));

  const q = params.query.trim().toLowerCase();
  if (!q) return MOCK_LAND_RECORDS;

  return MOCK_LAND_RECORDS.filter((rec) => {
    if (params.search_type === "survey") {
      return (
        rec.survey_number.toLowerCase().includes(q) ||
        (rec.hissa_number && rec.hissa_number.toLowerCase().includes(q))
      );
    }
    if (params.search_type === "property") {
      return (
        (rec.property_id && rec.property_id.toLowerCase().includes(q)) ||
        rec.ror_number.toLowerCase().includes(q)
      );
    }
    if (params.search_type === "owner") {
      return (
        rec.owner_name.toLowerCase().includes(q) ||
        (rec.kannada_owner_name && rec.kannada_owner_name.includes(q)) ||
        rec.father_or_guardian_name.toLowerCase().includes(q)
      );
    }
    return (
      rec.owner_name.toLowerCase().includes(q) ||
      rec.survey_number.toLowerCase().includes(q) ||
      rec.village.toLowerCase().includes(q)
    );
  });
}

/**
 * Fetch a single official land record / Record of Rights by ID or RoR Number.
 * TODO: Replace mock implementation with FastAPI endpoint: GET /api/v1/land-records/{id}
 */
export async function fetchLandRecordById(id: string | number): Promise<LandRecord | null> {
  await new Promise((res) => setTimeout(res, 150));
  const idStr = String(id).toLowerCase();

  const found = MOCK_LAND_RECORDS.find(
    (r) =>
      String(r.id).toLowerCase() === idStr ||
      r.ror_number.toLowerCase() === idStr ||
      r.survey_number.toLowerCase().replace(/\s/g, "") === idStr.replace(/\s/g, "")
  );

  return found || null;
}

/**
 * Simulate OCR extraction fields for the Review Extracted Information screen.
 * TODO: Replace mock implementation with FastAPI endpoint: GET /api/v1/digitize/{job_id}/fields
 */
export async function fetchExtractedLandFields(
  documentId?: string | number
): Promise<ExtractedLandField[]> {
  await new Promise((res) => setTimeout(res, 300));
  return MOCK_EXTRACTED_LAND_FIELDS;
}

/**
 * Track an ongoing citizen land digitization request in real-time.
 * TODO: Replace mock implementation with FastAPI endpoint: GET /api/v1/track/{request_id}
 */
export async function trackApplicationStatus(
  queryId: string
): Promise<TrackingApplication | null> {
  await new Promise((res) => setTimeout(res, 250));
  const cleanId = queryId.trim().toUpperCase();

  if (MOCK_TRACKING_APPLICATIONS[cleanId]) {
    return MOCK_TRACKING_APPLICATIONS[cleanId];
  }

  // Check matching by digit
  const digits = cleanId.replace(/\D/g, "");
  if (digits && MOCK_TRACKING_APPLICATIONS[digits]) {
    return MOCK_TRACKING_APPLICATIONS[digits];
  }

  // Fallback match to first mock record
  if (cleanId.includes("REQ") || cleanId.length >= 1) {
    return {
      ...MOCK_TRACKING_APPLICATIONS["REQ-KA-2026-001"],
      request_id: cleanId,
    };
  }

  return null;
}

/**
 * Verify document cryptographic signature and digital seal.
 * TODO: Replace mock implementation with FastAPI endpoint: POST /api/v1/verify
 */
export async function verifyRecordSignature(
  recordOrHash: string
): Promise<VerificationCheckResult> {
  await new Promise((res) => setTimeout(res, 300));
  const query = recordOrHash.trim();

  // Check direct lookup table
  if (MOCK_VERIFICATION_LOOKUP[query]) {
    return MOCK_VERIFICATION_LOOKUP[query];
  }

  // Check land records
  const matched = MOCK_LAND_RECORDS.find(
    (r) =>
      r.ror_number.toLowerCase() === query.toLowerCase() ||
      r.sha256_hash.toLowerCase().startsWith(query.toLowerCase()) ||
      String(r.id) === query
  );

  if (matched) {
    return {
      is_verified: true,
      record_id: String(matched.id),
      ror_number: matched.ror_number,
      survey_number: matched.survey_number,
      owner_name: matched.owner_name,
      issuing_authority: matched.issuing_authority,
      verification_timestamp: new Date().toISOString(),
      sha256_hash: matched.sha256_hash,
      digital_seal: `NIC-CERT-SEAL-${matched.id}-OK`,
      details: matched,
    };
  }

  // Not found / Tampered result
  return {
    is_verified: false,
    record_id: query,
    ror_number: "UNKNOWN",
    survey_number: "NOT_FOUND",
    owner_name: "UNREGISTERED",
    issuing_authority: "UNAUTHORIZED",
    verification_timestamp: new Date().toISOString(),
    sha256_hash: "0000000000000000000000000000000000000000000000000000000000000000",
    digital_seal: "INVALID_OR_REVOKED",
  };
}

// ==============================================================================
// 2. BACKEND INTEGRATION LAYER (FastAPI Client with Mock Fallback)
// ==============================================================================

/**
 * List all digitized documents in the PostgreSQL repository.
 * TODO: Replace fallback with direct FastAPI production endpoint: GET /api/v1/documents/
 */
export async function fetchDocuments(skip = 0, limit = 50): Promise<DocumentItem[]> {
  try {
    const res = await fetch(`${API_V1}/documents/?skip=${skip}&limit=${limit}`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch (e) {
    console.info("Using mock documents fallback (FastAPI offline).");
  }

  // Mock document items mapping from MOCK_LAND_RECORDS
  return MOCK_LAND_RECORDS.map((rec) => ({
    id: Number(rec.id) || 1,
    filename: rec.source_pdf_filename || `Record_${rec.survey_number.replace('/', '_')}.pdf`,
    file_hash: rec.sha256_hash,
    status: rec.status === "Digitally Verified" ? "COMPLETED" : "PROCESSING",
    storage_path: `uploads/${rec.sha256_hash.substring(0, 16)}_${rec.source_pdf_filename || 'deed.pdf'}`,
    created_at: new Date(rec.registration_date).toISOString(),
  }));
}

/**
 * Fetch document record by ID.
 * TODO: Replace fallback with direct FastAPI endpoint: GET /api/v1/documents/{id}
 */
export async function fetchDocument(id: number): Promise<DocumentItem> {
  try {
    const res = await fetch(`${API_V1}/documents/${id}`, { cache: "no-store" });
    if (res.ok) return res.json();
  } catch (e) {
    console.info(`Using mock document #${id} fallback.`);
  }

  const mock = MOCK_LAND_RECORDS.find((r) => Number(r.id) === id) || MOCK_LAND_RECORDS[0];
  return {
    id: Number(mock.id),
    filename: mock.source_pdf_filename || `Record_${mock.survey_number.replace('/', '_')}.pdf`,
    file_hash: mock.sha256_hash,
    status: mock.status === "Digitally Verified" ? "COMPLETED" : "PROCESSING",
    storage_path: `uploads/${mock.sha256_hash.substring(0, 16)}_${mock.source_pdf_filename || 'deed.pdf'}`,
    created_at: new Date(mock.registration_date).toISOString(),
  };
}

/**
 * Fetch real-time status of document processing.
 * TODO: Replace fallback with direct FastAPI endpoint: GET /api/v1/documents/{id}/status
 */
export async function fetchDocumentStatus(id: number): Promise<DocumentStatusResponse> {
  try {
    const res = await fetch(`${API_V1}/documents/${id}/status`, { cache: "no-store" });
    if (res.ok) return res.json();
  } catch (e) {
    console.info(`Using mock status for doc #${id}.`);
  }

  return {
    id,
    filename: `Record_Sy142_3A.pdf`,
    status: "COMPLETED",
    storage_path: "uploads/sample.pdf",
  };
}

/**
 * Fetch aggregate extraction results and validation info.
 * TODO: Replace fallback with direct FastAPI endpoint: GET /api/v1/documents/{id}/results
 */
export async function fetchDocumentResults(id: number): Promise<ExtractionResult | null> {
  try {
    const res = await fetch(`${API_V1}/documents/${id}/results`, { cache: "no-store" });
    if (res.status === 202) return null;
    if (res.ok) return res.json();
  } catch (e) {
    console.info(`Using mock extraction results for doc #${id}.`);
  }

  const mock = MOCK_LAND_RECORDS.find((r) => Number(r.id) === id) || MOCK_LAND_RECORDS[0];
  return {
    id: 1,
    document_id: id,
    extracted_data: {
      owner_name: mock.owner_name,
      father_name: mock.father_or_guardian_name,
      survey_number: mock.survey_number,
      hissa: mock.hissa_number,
      land_extent: mock.total_area_text,
      classification: mock.land_classification,
      revenue_assessment: `INR ${mock.revenue_assessment_inr}`,
      registration_date: mock.registration_date,
      taluk: mock.taluk,
      district: mock.district,
      state: mock.state,
    },
    confidence_score: 0.98,
    is_valid: true,
    validation_info: {
      checks_passed: [
        "Survey number format syntax validated (Sec-108A)",
        "Mathematical extent balance matches cadastral map (2A 14G)",
        "Revenue assessment rate matches taluk gazette table",
        "Digital seal & sub-registrar stamp recognized",
      ],
      errors: [],
      warnings: [],
      rules_evaluated_count: 4,
    },
    processing_time_ms: 1240,
    created_at: new Date().toISOString(),
  };
}

/**
 * Fetch granular bounding fields for document detail view.
 * TODO: Replace fallback with direct FastAPI endpoint: GET /api/v1/documents/{id}/fields
 */
export async function fetchDocumentFields(
  id: number,
  minConfidence?: number,
  fieldName?: string
): Promise<ExtractedFieldsSummary | null> {
  try {
    const params = new URLSearchParams();
    if (minConfidence !== undefined) params.append("min_confidence", minConfidence.toString());
    if (fieldName) params.append("field_name", fieldName);

    const res = await fetch(`${API_V1}/documents/${id}/fields?${params.toString()}`, { cache: "no-store" });
    if (res.ok) return res.json();
  } catch (e) {
    console.info(`Using mock fields summary for doc #${id}.`);
  }

  const fields = MOCK_EXTRACTED_LAND_FIELDS.map((f, index) => ({
    id: index + 1,
    document_id: id,
    field_name: f.key,
    original_value: f.original_kannada,
    normalized_value: f.english_normalized,
    confidence_score: f.confidence,
    source_page: f.page_number,
    bounding_box: f.bounding_box || null,
    created_at: new Date().toISOString(),
  }));

  return {
    document_id: id,
    total_fields: fields.length,
    average_confidence: 0.96,
    fields,
  };
}

/**
 * Search documents in PostgreSQL by filename or extracted text.
 * TODO: Replace fallback with direct FastAPI endpoint: GET /api/v1/documents/search
 */
export async function searchDocuments(
  query: string,
  fieldName?: string,
  status?: string,
  skip = 0,
  limit = 50
): Promise<DocumentSearchResponse> {
  try {
    const params = new URLSearchParams();
    params.append("q", query);
    if (fieldName) params.append("field_name", fieldName);
    if (status) params.append("status", status);
    params.append("skip", skip.toString());
    params.append("limit", limit.toString());

    const res = await fetch(`${API_V1}/documents/search?${params.toString()}`, { cache: "no-store" });
    if (res.ok) return res.json();
  } catch (e) {
    console.info("Using mock document search fallback.");
  }

  const q = query.toLowerCase();
  const matched = MOCK_LAND_RECORDS.filter(
    (r) =>
      r.owner_name.toLowerCase().includes(q) ||
      r.survey_number.toLowerCase().includes(q) ||
      r.village.toLowerCase().includes(q) ||
      (r.source_pdf_filename && r.source_pdf_filename.toLowerCase().includes(q))
  );

  return {
    query,
    total_results: matched.length,
    skip,
    limit,
    results: matched.map((r) => ({
      id: Number(r.id) || 1,
      filename: r.source_pdf_filename || `Record_${r.survey_number.replace('/', '_')}.pdf`,
      file_hash: r.sha256_hash,
      status: r.status === "Digitally Verified" ? "COMPLETED" : "PROCESSING",
      storage_path: `uploads/${r.sha256_hash.substring(0, 16)}_deed.pdf`,
      created_at: new Date(r.registration_date).toISOString(),
      matched_fields: [],
      match_source: "both",
    })),
  };
}

/**
 * Upload document file to MinIO object storage.
 * TODO: Replace mock fallback with direct FastAPI endpoint: POST /api/v1/documents/upload
 */
export async function uploadDocumentFile(file: File): Promise<DocumentUploadResponse> {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_V1}/documents/upload`, {
      method: "POST",
      body: formData,
    });

    if (res.ok) return res.json();
  } catch (e) {
    console.info("Using simulated upload response (FastAPI offline).");
  }

  // Simulated immediate response for prototype UX
  await new Promise((res) => setTimeout(res, 600));
  return {
    message: "Document uploaded and processing job queued successfully.",
    is_duplicate: false,
    document: {
      id: 1,
      filename: file.name,
      file_hash: "7f6d3b68d46b6d9cbbca99141c127d1e4cc9c542c66eec4a214b77b682b4ec88",
      status: "COMPLETED",
      storage_path: `uploads/7f6d3b68d46b6d9c_${file.name}`,
      created_at: new Date().toISOString(),
    },
    task_id: "local-simulated-worker",
  };
}

/**
 * Delete a document from database and storage.
 * TODO: Replace mock fallback with direct FastAPI endpoint: DELETE /api/v1/documents/{id}
 */
export async function deleteDocumentRecord(id: number): Promise<void> {
  try {
    await fetch(`${API_V1}/documents/${id}`, { method: "DELETE" });
  } catch (e) {
    console.info(`Simulated deletion for doc #${id}.`);
  }
}

export function getDirectDownloadUrl(id: number): string {
  return `${API_V1}/documents/${id}/download`;
}

// ==============================================================================
// 3. HUMAN-IN-THE-LOOP ACTIVE LEARNING REVIEW & MODEL REGISTRY
// ==============================================================================

export async function fetchReviewQueue(
  skip = 0,
  limit = 50,
  languageScript?: string
): Promise<ReviewQueueResponse> {
  try {
    let url = `${API_V1}/review/queue?skip=${skip}&limit=${limit}`;
    if (languageScript) url += `&language_script=${encodeURIComponent(languageScript)}`;
    const res = await fetch(url, { cache: "no-store" });
    if (res.ok) return res.json();
  } catch (e) {
    console.info("Using mock review queue fallback.");
  }

  return {
    total_pending: 1,
    items: [
      {
        field_id: 101,
        document_id: 1,
        field_name: "Annual Land Revenue (ಕಂದಾಯ)",
        original_value: "ರೂ. ೨೪.೫೦",
        confidence_score: 0.78,
        review_status: "PENDING_REVIEW",
        candidates: [
          { text: "ರೂ. ೨೪.೫೦", score: 0.78 },
          { text: "ರೂ. ೨೮.೫೦", score: 0.62 },
        ],
        source_page: 1,
        bounding_box: { x_min: 0.12, y_min: 0.54, x_max: 0.42, y_max: 0.58 },
        language_script: "kannada_handwritten",
        model_version: "kannada-trocr-prod-v1.0",
        created_at: new Date().toISOString(),
      },
    ],
  };
}

export async function submitReviewDecision(
  fieldId: number,
  decision: ReviewDecisionRequest
): Promise<ReviewDecisionResponse> {
  try {
    const res = await fetch(`${API_V1}/review/${fieldId}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(decision),
    });
    if (res.ok) return res.json();
  } catch (e) {
    console.info(`Using simulated decision for field #${fieldId}.`);
  }

  return {
    success: true,
    message: "Verified ground truth saved successfully.",
    field_id: fieldId,
    action: decision.action,
    review_status: "VERIFIED",
    verified_sample_created: true,
  };
}

export async function fetchReviewStats(): Promise<ReviewStatsResponse> {
  try {
    const res = await fetch(`${API_V1}/review/stats`, { cache: "no-store" });
    if (res.ok) return res.json();
  } catch (e) {
    console.info("Using mock review stats fallback.");
  }

  return {
    pending_count: 1,
    verified_count: 24,
    rejected_count: 2,
    training_threshold: 20,
    ready_for_training: true,
  };
}

export async function fetchTrainingStatus(): Promise<TrainingStatusResponse> {
  try {
    const res = await fetch(`${API_V1}/training/status`, { cache: "no-store" });
    if (res.ok) return res.json();
  } catch (e) {
    console.info("Using mock training status fallback.");
  }

  return {
    active_learning_enabled: true,
    current_production_checkpoint: "kannada-trocr-prod-v1.0 (Official Gazette Checkpoint)",
    production_checkpoint_path: "models/kannada_trocr/production",
    verified_samples_count: 24,
    min_verified_samples_for_training: 20,
    ready_to_train: true,
    total_training_runs: 2,
  };
}

export async function triggerTraining(notes?: string): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(`${API_V1}/training/trigger`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    if (res.ok) return res.json();
  } catch (e) {
    console.info("Using simulated training trigger.");
  }

  return {
    success: true,
    message: "Fine-tuning job queued with 24 verified annotations.",
  };
}

export async function fetchTrainingRuns(skip = 0, limit = 50): Promise<TrainingRunItem[]> {
  try {
    const res = await fetch(`${API_V1}/training/runs?skip=${skip}&limit=${limit}`, { cache: "no-store" });
    if (res.ok) return res.json();
  } catch (e) {
    console.info("Using mock training runs fallback.");
  }

  return [
    {
      id: 1,
      status: "PROMOTED",
      base_checkpoint: "google/trocr-base-stage1",
      candidate_checkpoint_id: 101,
      candidate_version_tag: "kannada-trocr-prod-v1.0",
      candidate_status: "PROMOTED",
      num_samples_used: 150,
      metrics: { train_samples: 125, val_samples: 25, cer: 0.042 },
      started_at: "2026-03-01T10:00:00Z",
      completed_at: "2026-03-01T10:45:00Z",
    },
  ];
}

export async function fetchRunEvaluation(runId: number): Promise<EvaluationResponse> {
  return {
    run_id: runId,
    candidate_checkpoint_id: 101,
    candidate_version_tag: "kannada-trocr-candidate-v1.1",
    available: true,
    recommend_promotion: true,
    has_improvement: true,
    has_regression: false,
    reasons: [
      "Character Error Rate (CER) reduced by 14.2% on handwritten Kannada test set",
      "Zero degradation on printed Kannada cadastral boundaries",
      "Passed all statutory gazette validation checks",
    ],
  };
}

export async function promoteCandidateRun(runId: number, force = false): Promise<PromotionResponse> {
  return {
    success: true,
    message: "Candidate model successfully promoted to production serving traffic.",
    checkpoint_id: 102,
    version_tag: "kannada-trocr-prod-v1.1",
    status: "PROMOTED",
    promoted_at: new Date().toISOString(),
  };
}

export async function rejectCandidateRun(runId: number, reason?: string): Promise<PromotionResponse> {
  return {
    success: true,
    message: "Candidate run rejected.",
    checkpoint_id: 102,
    version_tag: "rejected",
    status: "REJECTED",
  };
}

export async function rollbackCheckpoint(checkpointId: number): Promise<PromotionResponse> {
  return {
    success: true,
    message: "Production checkpoint rolled back to previous verified state.",
    checkpoint_id: checkpointId,
    version_tag: "kannada-trocr-prod-v1.0",
    status: "PROMOTED",
  };
}
