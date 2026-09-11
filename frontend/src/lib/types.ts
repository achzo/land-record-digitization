export type DocumentStatus = "UPLOADED" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface BoundingBox {
  x_min: number;
  y_min: number;
  x_max: number;
  y_max: number;
  unit?: string;
}

export interface DocumentItem {
  id: number;
  filename: string;
  file_hash: string;
  status: DocumentStatus;
  storage_path: string | null;
  created_at: string;
}

export interface DocumentUploadResponse {
  message: string;
  is_duplicate: boolean;
  document: DocumentItem;
  task_id: string | null;
}

export interface DocumentStatusResponse {
  id: number;
  filename: string;
  status: DocumentStatus;
  storage_path: string | null;
}

export interface ExtractedField {
  id: number;
  document_id: number;
  field_name: string;
  original_value: string | null;
  normalized_value: string | null;
  confidence_score: number;
  source_page: number;
  bounding_box: BoundingBox | null;
  created_at: string;
}

export interface ExtractedFieldsSummary {
  document_id: number;
  total_fields: number;
  average_confidence: number;
  fields: ExtractedField[];
}

export interface ExtractionResult {
  id: number;
  document_id: number;
  extracted_data: Record<string, any>;
  confidence_score: number;
  is_valid: boolean;
  validation_info: {
    checks_passed?: string[];
    errors?: string[];
    warnings?: string[];
    rules_evaluated_count?: number;
  };
  processing_time_ms: number;
  created_at: string;
}

export interface DocumentSearchItem {
  id: number;
  filename: string;
  file_hash: string;
  status: DocumentStatus;
  storage_path: string | null;
  created_at: string;
  matched_fields: ExtractedField[];
  match_source: "filename" | "extracted_fields" | "both";
}

export interface DocumentSearchResponse {
  query: string;
  total_results: number;
  skip: number;
  limit: number;
  results: DocumentSearchItem[];
}

// ----------------------------------------------------
// BhumiAI Land Records Domain Types
// ----------------------------------------------------

export interface LandRecord {
  id: string | number;
  ror_number: string;
  survey_number: string;
  hissa_number?: string;
  property_id?: string;
  owner_name: string;
  father_or_guardian_name: string;
  state: string;
  district: string;
  taluk: string;
  hobli: string;
  village: string;
  land_extent_acres: number;
  land_extent_guntas: number;
  total_area_text: string;
  land_classification: "Dry Agricultural (Khushki)" | "Wet Agricultural (Tari)" | "Garden Land (Bagayat)" | "Non-Agricultural (Converted)" | "Industrial";
  soil_type?: string;
  revenue_assessment_inr: number;
  registration_date: string;
  issuing_authority: string;
  status: "Digitally Verified" | "Under Review" | "Pending Field Survey" | "Action Required";
  verification_seal_number: string;
  sha256_hash: string;
  document_type: "Record of Rights (RTC / Pahani)" | "Sale Deed (Kraya Patra)" | "Akarband Map" | "Mutation Extract";
  kannada_owner_name?: string;
  kannada_village_name?: string;
  source_pdf_filename?: string;
  download_url?: string;
}

export interface LandRecordSearchQuery {
  search_type: "survey" | "property" | "owner";
  query: string;
  state?: string;
  district?: string;
  taluk?: string;
  village?: string;
}

export interface ExtractedLandField {
  key: string;
  label: string;
  original_kannada: string;
  english_normalized: string;
  confidence: number;
  is_low_confidence: boolean;
  page_number: number;
  bounding_box?: BoundingBox;
}

export interface TrackingStep {
  title: string;
  description: string;
  timestamp: string;
  status: "completed" | "current" | "upcoming";
}

export interface TrackingApplication {
  request_id: string;
  mobile_number?: string;
  document_type: string;
  survey_number: string;
  owner_name: string;
  location: string;
  submission_date: string;
  estimated_completion: string;
  current_status: "Submitted" | "Document Reading" | "Information Review" | "Verification" | "Completed" | "Action Required";
  progress_percentage: number;
  steps: TrackingStep[];
  record_id?: string;
}

export interface VerificationCheckResult {
  is_verified: boolean;
  record_id: string;
  ror_number: string;
  survey_number: string;
  owner_name: string;
  issuing_authority: string;
  verification_timestamp: string;
  sha256_hash: string;
  digital_seal: string;
  details?: LandRecord;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: "General" | "Digitization" | "Search" | "Verification" | "Legal";
}

// ----------------------------------------------------
// Review Queue & Model Registry Types
// ----------------------------------------------------

export interface ReviewQueueItem {
  field_id: number;
  document_id: number;
  field_name: string;
  original_value: string | null;
  confidence_score: number;
  review_status: string;
  candidates?: Array<{ text: string; score: number }> | null;
  crop_image_path?: string | null;
  source_page: number;
  bounding_box?: BoundingBox | null;
  language_script?: string | null;
  model_version?: string | null;
  created_at: string;
}

export interface ReviewQueueResponse {
  total_pending: number;
  items: ReviewQueueItem[];
}

export interface ReviewDecisionRequest {
  action: "ACCEPT" | "CORRECT" | "REJECT";
  corrected_text?: string;
  selected_candidate_index?: number;
  rejection_reason?: string;
}

export interface ReviewDecisionResponse {
  success: boolean;
  message: string;
  field_id: number;
  action: string;
  review_status: string;
  verified_sample_created: boolean;
  sample_id?: number;
  verified_text?: string;
}

export interface ReviewStatsResponse {
  pending_count: number;
  verified_count: number;
  rejected_count: number;
  training_threshold: number;
  ready_for_training: boolean;
}

export interface TrainingStatusResponse {
  active_learning_enabled: boolean;
  current_production_checkpoint: string;
  production_checkpoint_path: string;
  verified_samples_count: number;
  min_verified_samples_for_training: number;
  ready_to_train: boolean;
  active_training_run?: { id: number; status: string; started_at: string } | null;
  total_training_runs: number;
}

export interface TrainingRunItem {
  id: number;
  status: string;
  base_checkpoint: string;
  candidate_checkpoint_id?: number | null;
  candidate_version_tag?: string | null;
  candidate_status?: string | null;
  num_samples_used: number;
  metrics?: Record<string, any> | null;
  error_message?: string | null;
  started_at: string;
  completed_at?: string | null;
}

export interface EvaluationResponse {
  run_id: number;
  candidate_checkpoint_id?: number | null;
  candidate_version_tag?: string | null;
  available: boolean;
  metrics?: Record<string, any> | null;
  recommend_promotion: boolean;
  has_improvement: boolean;
  has_regression: boolean;
  reasons: string[];
}

export interface PromotionResponse {
  success: boolean;
  message: string;
  checkpoint_id: number;
  version_tag: string;
  status: string;
  promoted_at?: string | null;
}
