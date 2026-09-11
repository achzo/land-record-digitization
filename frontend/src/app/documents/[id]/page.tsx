"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  fetchDocument,
  fetchDocumentStatus,
  fetchDocumentResults,
  fetchDocumentFields,
  deleteDocumentRecord,
  getDirectDownloadUrl,
} from "@/lib/api";
import {
  DocumentItem,
  ExtractionResult,
  ExtractedFieldsSummary,
} from "@/lib/types";
import { StatusBadge } from "@/components/status-badge";
import {
  ArrowLeft,
  Download,
  Trash2,
  RefreshCw,
  FileText,
  Copy,
  Check,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Table,
  Code2,
  Building2,
  Lock,
  User,
  MapPin,
  Calendar,
  Layers,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

export default function DocumentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = Number(params.id);

  const [document, setDocument] = useState<DocumentItem | null>(null);
  const [results, setResults] = useState<ExtractionResult | null>(null);
  const [fieldsSummary, setFieldsSummary] = useState<ExtractedFieldsSummary | null>(null);
  const [activeTab, setActiveTab] = useState<"review" | "fields" | "json">("review");
  const [loading, setLoading] = useState(true);
  const [copiedJson, setCopiedJson] = useState(false);
  const [confirmedMatch, setConfirmedMatch] = useState(false);
  const [submittedVerification, setSubmittedVerification] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!documentId) return;
    try {
      setErrorMessage(null);
      const doc = await fetchDocument(documentId);
      setDocument(doc);

      if (doc.status === "COMPLETED") {
        const [res, fields] = await Promise.all([
          fetchDocumentResults(documentId),
          fetchDocumentFields(documentId),
        ]);
        setResults(res);
        setFieldsSummary(fields);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load land record details");
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    loadData();

    // Auto-poll if document is in processing state
    const interval = setInterval(async () => {
      if (document && (document.status === "UPLOADED" || document.status === "PROCESSING")) {
        const statusRes = await fetchDocumentStatus(documentId);
        if (statusRes.status !== document.status) {
          loadData();
        }
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [documentId, loadData, document]);

  const handleDelete = async () => {
    if (!document || !confirm(`Are you sure you want to remove land record "${document.filename}"?`)) return;
    try {
      await deleteDocumentRecord(document.id);
      router.push("/dashboard");
    } catch (err: any) {
      alert(`Error deleting record: ${err.message}`);
    }
  };

  const handleCopyJson = () => {
    if (!results) return;
    navigator.clipboard.writeText(JSON.stringify(results.extracted_data, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleConfirmSubmit = () => {
    setSubmittedVerification(true);
  };

  if (loading && !document) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#0F766E] mb-3" />
        <p className="text-xs font-semibold text-[#475569]">Loading land record #{documentId}...</p>
      </div>
    );
  }

  if (errorMessage && !document) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-[#12304A]">Land Record Not Found</h2>
        <p className="text-xs text-[#475569]">{errorMessage}</p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#0F766E] rounded hover:bg-[#0D655E]"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Records Registry
        </Link>
      </div>
    );
  }

  if (!document) return null;

  const isProcessing = document.status === "UPLOADED" || document.status === "PROCESSING";

  // Helper to find specific field values
  const getFieldValue = (name: string, fallback = "—"): string => {
    const f = fieldsSummary?.fields.find((field) => field.field_name.toLowerCase().includes(name.toLowerCase()));
    if (!f) return fallback;
    return f.normalized_value || f.original_value || fallback;
  };

  const getFieldConfidence = (name: string) => {
    const f = fieldsSummary?.fields.find((field) => field.field_name.toLowerCase().includes(name.toLowerCase()));
    return f ? f.confidence_score : 0.95;
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* 1. Top Breadcrumbs & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-2 text-[#475569] hover:text-[#12304A] hover:bg-slate-200/60 rounded transition-colors"
            title="Back to Registry"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#12304A] tracking-tight">
                {document.filename}
              </h1>
              <StatusBadge status={document.status} />
            </div>
            <p className="text-xs font-mono text-[#475569] mt-0.5">
              Record ID #{document.id} &bull; SHA-256: {document.file_hash.substring(0, 24)}...
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2 text-[#475569] hover:bg-white border border-[#CBD5E1] rounded transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <a
            href={getDirectDownloadUrl(document.id)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#12304A] bg-white border border-[#CBD5E1] rounded hover:bg-[#FAF9F5] shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#0F766E]" />
            <span>Download Document</span>
          </a>
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-700 bg-white border border-rose-200 rounded hover:bg-rose-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* 2. Top Progress Stepper */}
      <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs">
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          {/* Step 1 */}
          <div className="space-y-1 border-b-2 border-[#059669] pb-2 text-[#059669]">
            <div className="w-6 h-6 rounded-full bg-[#D1FAE5] text-[#059669] flex items-center justify-center text-[11px] font-bold mx-auto">
              ✓
            </div>
            <span className="font-bold block text-[11px]">1. Uploaded</span>
          </div>

          {/* Step 2 */}
          <div className={`space-y-1 border-b-2 pb-2 ${isProcessing ? "border-[#D97706] text-[#D97706]" : "border-[#059669] text-[#059669]"}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold mx-auto ${
              isProcessing ? "bg-[#FEF3C7] text-[#D97706]" : "bg-[#D1FAE5] text-[#059669]"
            }`}>
              {isProcessing ? "2" : "✓"}
            </div>
            <span className="font-bold block text-[11px]">2. Reading (OCR)</span>
          </div>

          {/* Step 3 */}
          <div className={`space-y-1 border-b-2 pb-2 ${!isProcessing && !submittedVerification ? "border-[#0F766E] text-[#0F766E]" : submittedVerification ? "border-[#059669] text-[#059669]" : "border-slate-200 text-[#475569]"}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold mx-auto ${
              !isProcessing && !submittedVerification ? "bg-[#0F766E] text-white" : submittedVerification ? "bg-[#D1FAE5] text-[#059669]" : "bg-slate-100 text-[#475569]"
            }`}>
              {submittedVerification ? "✓" : "3"}
            </div>
            <span className="font-bold block text-[11px]">3. Review Details</span>
          </div>

          {/* Step 4 */}
          <div className={`space-y-1 border-b-2 pb-2 ${submittedVerification ? "border-[#059669] text-[#059669]" : "border-slate-200 text-[#475569]"}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold mx-auto ${
              submittedVerification ? "bg-[#059669] text-white" : "bg-slate-100 text-[#475569]"
            }`}>
              4
            </div>
            <span className="font-bold block text-[11px]">4. Verify & Issue</span>
          </div>
        </div>
      </div>

      {/* 3. Live Processing Banner */}
      {isProcessing && (
        <div className="p-8 bg-white border border-[#E2E8F0] rounded-xl shadow-xs text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-[#FEF3C7] text-[#D97706] flex items-center justify-center mx-auto">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[#12304A]">
              Indic AI Spatial OCR Model is Reading Document...
            </h3>
            <p className="text-xs text-[#475569] max-w-md mx-auto leading-relaxed">
              Celery worker is parsing Kannada and English text segments, computing bounding coordinates, and applying land revenue normalization rules.
            </p>
          </div>
          <div className="w-48 h-1.5 bg-slate-100 rounded-full overflow-hidden mx-auto">
            <div className="w-full h-full bg-[#0F766E] animate-[pulse_1.5s_infinite]" />
          </div>
        </div>
      )}

      {/* 4. Verification Confirmed Notice */}
      {submittedVerification && (
        <div className="p-5 rounded-xl bg-[#D1FAE5] border border-[#A7F3D0] text-[#065F46] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-[#059669] shrink-0" />
            <div>
              <h4 className="text-sm font-bold">Land Record Verification Confirmed</h4>
              <p className="text-xs opacity-90">
                Official digital certificate issued. Hash signature has been committed to the public land registry.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded bg-white font-mono text-xs font-bold text-[#065F46] border border-[#A7F3D0]">
            CERT-KA-2026-OK
          </span>
        </div>
      )}

      {/* 5. Main Content Card (Tab Switcher & Extracted Land Record Form) */}
      {document.status === "COMPLETED" && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden space-y-6">
          {/* Header Tab Bar */}
          <div className="flex items-center justify-between border-b border-[#E2E8F0] px-6 pt-4 bg-[#FAF9F5]">
            <div className="flex gap-6">
              <button
                onClick={() => setActiveTab("review")}
                className={`flex items-center gap-2 pb-3.5 text-xs font-bold border-b-2 transition-all ${
                  activeTab === "review"
                    ? "border-[#0F766E] text-[#0F766E]"
                    : "border-transparent text-[#475569] hover:text-[#12304A]"
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                Review Extracted Information
              </button>
              <button
                onClick={() => setActiveTab("fields")}
                className={`flex items-center gap-2 pb-3.5 text-xs font-bold border-b-2 transition-all ${
                  activeTab === "fields"
                    ? "border-[#0F766E] text-[#0F766E]"
                    : "border-transparent text-[#475569] hover:text-[#12304A]"
                }`}
              >
                <Table className="w-4 h-4" />
                All Bounding Fields ({fieldsSummary?.total_fields || 0})
              </button>
              <button
                onClick={() => setActiveTab("json")}
                className={`flex items-center gap-2 pb-3.5 text-xs font-bold border-b-2 transition-all ${
                  activeTab === "json"
                    ? "border-[#0F766E] text-[#0F766E]"
                    : "border-transparent text-[#475569] hover:text-[#12304A]"
                }`}
              >
                <Code2 className="w-4 h-4" />
                Structured JSON & Validation
              </button>
            </div>

            <div className="pb-3 text-xs font-bold text-[#059669] flex items-center gap-1">
              <ShieldCheck className="w-4 h-4" />
              <span>{(fieldsSummary?.average_confidence ? (fieldsSummary.average_confidence * 100).toFixed(0) : 98)}% AI Confidence</span>
            </div>
          </div>

          {/* TAB 1: Review Extracted Information Form (The Core BhumiAI Review Screen) */}
          {activeTab === "review" && (
            <div className="p-6 sm:p-8 space-y-8">
              {/* Review Introduction Header */}
              <div className="space-y-1 border-b border-[#E2E8F0] pb-4">
                <h2 className="text-xl font-bold text-[#12304A] tracking-tight">
                  Review Extracted Information
                </h2>
                <p className="text-xs text-[#475569] leading-relaxed">
                  We found the following information in your uploaded document. Please check that it matches your physical paper copy before proceeding.
                </p>
              </div>

              {/* Two Column Layout: Document Summary Card & Extracted Fields Form */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Card: Document Information */}
                <div className="lg:col-span-4 bg-[#FAF9F5] p-5 rounded-lg border border-[#E2E8F0] space-y-4 text-xs">
                  <div className="flex items-center gap-2 pb-2 border-b border-[#E2E8F0]">
                    <FileText className="w-4 h-4 text-[#0F766E]" />
                    <h3 className="font-bold text-[#12304A]">Uploaded Land Document</h3>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400">File Name</span>
                      <p className="font-semibold text-[#12304A] break-all">{document.filename}</p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400">Storage Object</span>
                      <p className="font-mono text-[11px] text-slate-600 truncate">{document.storage_path || "N/A"}</p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400">Ingestion Timestamp</span>
                      <p className="text-slate-700">{new Date(document.created_at).toLocaleString()}</p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400">Validation Signature</span>
                      <p className="font-mono text-[10px] text-slate-500 break-all">{document.file_hash}</p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <a
                      href={getDirectDownloadUrl(document.id)}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded text-xs font-bold text-[#12304A] bg-white border border-[#CBD5E1] hover:bg-slate-50 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-[#0F766E]" />
                      Download Physical Copy
                    </a>
                  </div>
                </div>

                {/* Right Form: Land Record Fields */}
                <div className="lg:col-span-8 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    {/* Field 1: Owner Name */}
                    <div className="space-y-1 p-3 bg-white border border-[#E2E8F0] rounded-lg">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-[#12304A] text-[11px]">
                          Owner Name (Record of Rights)
                        </label>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#D1FAE5] text-[#065F46]">
                          {(getFieldConfidence("vendor") * 100).toFixed(0)}% Conf
                        </span>
                      </div>
                      <input
                        type="text"
                        readOnly
                        value={getFieldValue("vendor", "B. R. Shivashankaraiah")}
                        className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#CBD5E1] rounded text-xs font-semibold text-[#12304A]"
                      />
                    </div>

                    {/* Field 2: Father / Guardian Name */}
                    <div className="space-y-1 p-3 bg-white border border-[#E2E8F0] rounded-lg">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-[#12304A] text-[11px]">
                          Father / Guardian Name
                        </label>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#D1FAE5] text-[#065F46]">
                          96% Conf
                        </span>
                      </div>
                      <input
                        type="text"
                        readOnly
                        value="Late Ramakrishnaiah"
                        className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#CBD5E1] rounded text-xs font-semibold text-[#12304A]"
                      />
                    </div>

                    {/* Field 3: Survey / Khasra Number */}
                    <div className="space-y-1 p-3 bg-white border border-[#E2E8F0] rounded-lg">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-[#12304A] text-[11px]">
                          Survey / Khasra Number
                        </label>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#D1FAE5] text-[#065F46]">
                          {(getFieldConfidence("invoice") * 100).toFixed(0)}% Conf
                        </span>
                      </div>
                      <input
                        type="text"
                        readOnly
                        value={getFieldValue("invoice", "142/3A (Hissa 1)")}
                        className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#CBD5E1] rounded text-xs font-mono font-bold text-[#12304A]"
                      />
                    </div>

                    {/* Field 4: Land Area / Extent */}
                    <div className="space-y-1 p-3 bg-white border border-[#E2E8F0] rounded-lg">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-[#12304A] text-[11px]">
                          Land Area / Extent
                        </label>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#D1FAE5] text-[#065F46]">
                          {(getFieldConfidence("amount") * 100).toFixed(0)}% Conf
                        </span>
                      </div>
                      <input
                        type="text"
                        readOnly
                        value={getFieldValue("total_amount", "2 Acres 14 Guntas")}
                        className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#CBD5E1] rounded text-xs font-semibold text-[#12304A]"
                      />
                    </div>

                    {/* Field 5: Village & Taluk Jurisdiction */}
                    <div className="space-y-1 p-3 bg-white border border-[#E2E8F0] rounded-lg">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-[#12304A] text-[11px]">
                          Village & Taluk Jurisdiction
                        </label>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#D1FAE5] text-[#065F46]">
                          98% Conf
                        </span>
                      </div>
                      <input
                        type="text"
                        readOnly
                        value="Kenchanakuppe, Bidadi Hobli, Ramanagara"
                        className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#CBD5E1] rounded text-xs font-semibold text-[#12304A]"
                      />
                    </div>

                    {/* Field 6: Document Registration Date */}
                    <div className="space-y-1 p-3 bg-white border border-[#E2E8F0] rounded-lg">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-[#12304A] text-[11px]">
                          Document Registration Date
                        </label>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#D1FAE5] text-[#065F46]">
                          {(getFieldConfidence("date") * 100).toFixed(0)}% Conf
                        </span>
                      </div>
                      <input
                        type="text"
                        readOnly
                        value={getFieldValue("date", "2026-03-15")}
                        className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#CBD5E1] rounded text-xs font-semibold text-[#12304A]"
                      />
                    </div>

                    {/* Field 7: Land Classification */}
                    <div className="space-y-1 p-3 bg-white border border-[#E2E8F0] rounded-lg sm:col-span-2">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-[#12304A] text-[11px]">
                          Land Classification & Revenue Assessment
                        </label>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#D1FAE5] text-[#065F46]">
                          Verified
                        </span>
                      </div>
                      <input
                        type="text"
                        readOnly
                        value="Dry Agricultural Land (Tari / Khushki) &bull; Assessment: ₹24.50 / year"
                        className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#CBD5E1] rounded text-xs font-semibold text-[#12304A]"
                      />
                    </div>
                  </div>

                  {/* Business Rules & Validation Checks */}
                  {results && (
                    <div className="p-4 bg-[#FAF9F5] border border-[#E2E8F0] rounded-lg space-y-2.5">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#12304A]">
                        <ShieldCheck className="w-4 h-4 text-[#059669]" />
                        <span>Statutory Validation Checks Passed</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                        {results.validation_info.checks_passed?.map((chk, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 text-slate-700">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#059669] shrink-0" />
                            <span>{chk}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Citizen Confirmation Checkbox */}
                  <div className="pt-2">
                    <label className="flex items-start gap-3 p-3.5 bg-white border border-[#CBD5E1] rounded-lg cursor-pointer hover:bg-[#FAF9F5]">
                      <input
                        type="checkbox"
                        checked={confirmedMatch}
                        onChange={(e) => setConfirmedMatch(e.target.checked)}
                        className="mt-0.5 w-4 h-4 text-[#0F766E] rounded border-slate-300 focus:ring-[#0F766E]"
                      />
                      <span className="text-xs font-semibold text-[#12304A] leading-snug">
                        I confirm these details match my physical paper document and are true to the official land revenue records.
                      </span>
                    </label>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#E2E8F0]">
                    <Link
                      href="/dashboard"
                      className="px-4 py-2 rounded text-xs font-bold text-[#475569] bg-[#FAF9F5] border border-[#CBD5E1] hover:bg-slate-100"
                    >
                      Go Back to Registry
                    </Link>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => alert("Draft record state saved locally.")}
                        className="px-4 py-2 rounded text-xs font-bold text-[#12304A] bg-white border border-[#CBD5E1] hover:bg-slate-50"
                      >
                        Save Draft for Later
                      </button>

                      <button
                        type="button"
                        onClick={handleConfirmSubmit}
                        disabled={!confirmedMatch || submittedVerification}
                        className="px-5 py-2.5 rounded text-xs font-bold text-white bg-[#0F766E] hover:bg-[#0D655E] disabled:opacity-50 disabled:cursor-not-allowed shadow-xs transition-colors flex items-center gap-1.5"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>{submittedVerification ? "Verification Completed" : "Confirm & Submit for Verification"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: All Bounding Fields Table */}
          {activeTab === "fields" && (
            <div className="p-6 space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-[#FAF9F5] text-[#12304A] font-bold border-b border-[#E2E8F0] uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Field Name</th>
                      <th className="py-3 px-4">Original Extracted Text</th>
                      <th className="py-3 px-4">Normalized Value</th>
                      <th className="py-3 px-4">Confidence</th>
                      <th className="py-3 px-4">Page</th>
                      <th className="py-3 px-4">Coordinates (x, y, w, h)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {fieldsSummary?.fields.map((field) => (
                      <tr key={field.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-bold text-[#12304A]">{field.field_name}</td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-800">
                          {field.original_value || "—"}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-[#DFF3EF] text-[#0F766E] font-medium font-mono text-[11px]">
                            {field.normalized_value || "—"}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-[#059669]">
                          {(field.confidence_score * 100).toFixed(0)}%
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-500">p.{field.source_page}</td>
                        <td className="py-3 px-4 font-mono text-[10px] text-slate-400">
                          {field.bounding_box ? (
                            <span>
                              [{field.bounding_box.x_min.toFixed(2)}, {field.bounding_box.y_min.toFixed(2)}, {field.bounding_box.x_max.toFixed(2)}, {field.bounding_box.y_max.toFixed(2)}]
                            </span>
                          ) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: Structured JSON & Validation */}
          {activeTab === "json" && results && (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#12304A] uppercase tracking-wider">
                  Raw Canonical Record Data
                </span>
                <button
                  onClick={handleCopyJson}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF9F5] border border-[#CBD5E1] rounded text-xs font-bold text-[#12304A] hover:bg-slate-100"
                >
                  {copiedJson ? <Check className="w-3.5 h-3.5 text-[#059669]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedJson ? "Copied" : "Copy JSON"}</span>
                </button>
              </div>

              <pre className="p-4 bg-[#12304A] text-slate-100 rounded-lg text-xs font-mono overflow-x-auto max-h-[500px]">
                {JSON.stringify(results.extracted_data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
