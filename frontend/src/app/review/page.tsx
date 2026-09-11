"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  fetchReviewQueue,
  fetchReviewStats,
  submitReviewDecision,
} from "@/lib/api";
import {
  ReviewQueueItem,
  ReviewStatsResponse,
} from "@/lib/types";
import {
  CheckSquare,
  RefreshCw,
  Check,
  Edit3,
  XCircle,
  AlertCircle,
  FileText,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Loader2,
  Building2,
} from "lucide-react";

export default function ReviewQueuePage() {
  const [queue, setQueue] = useState<ReviewQueueItem[]>([]);
  const [stats, setStats] = useState<ReviewStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [edits, setEdits] = useState<Record<number, string>>({});
  const [feedback, setFeedback] = useState<{ id: number; message: string; type: "success" | "error" } | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [queueRes, statsRes] = await Promise.all([
        fetchReviewQueue(),
        fetchReviewStats(),
      ]);
      setQueue(queueRes.items);
      setStats(statsRes);

      const initialEdits: Record<number, string> = {};
      queueRes.items.forEach((item) => {
        initialEdits[item.field_id] = item.original_value || "";
      });
      setEdits(initialEdits);
    } catch (err: any) {
      console.error("Failed to load review queue:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDecision = async (
    fieldId: number,
    action: "ACCEPT" | "CORRECT" | "REJECT",
    selectedCandidateIndex?: number
  ) => {
    setActionLoading(fieldId);
    setFeedback(null);
    try {
      const correctedText = edits[fieldId];
      const res = await submitReviewDecision(fieldId, {
        action,
        corrected_text: action === "CORRECT" ? correctedText : undefined,
        selected_candidate_index: selectedCandidateIndex,
      });

      setFeedback({
        id: fieldId,
        message: res.message,
        type: "success",
      });

      setQueue((prev) => prev.filter((item) => item.field_id !== fieldId));
      const updatedStats = await fetchReviewStats();
      setStats(updatedStats);
    } catch (err: any) {
      setFeedback({
        id: fieldId,
        message: err.message || "Failed to submit decision",
        type: "error",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSelectCandidate = (fieldId: number, candText: string) => {
    setEdits((prev) => ({
      ...prev,
      [fieldId]: candText,
    }));
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#DFF3EF] text-[#0F766E] text-[11px] font-bold uppercase tracking-wider">
            <CheckSquare className="w-3.5 h-3.5" />
            Human-in-the-Loop Quality Assurance
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#12304A] tracking-tight mt-1">
            Handwritten Land Record Review Queue
          </h1>
          <p className="text-xs text-[#475569] mt-0.5">
            Review uncertain handwritten Kannada land record extractions. Verified annotations become active learning ground truth.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-[#12304A] bg-white border border-[#CBD5E1] rounded hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <Link
            href="/training"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#0F766E] hover:bg-[#0D655E] rounded shadow-2xs transition-colors"
          >
            <span>Model Registry</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#475569] uppercase tracking-wider">Pending Review</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FEF3C7] text-[#92400E]">
                Action Required
              </span>
            </div>
            <p className="text-2xl font-extrabold text-[#12304A] mt-1.5">{stats.pending_count}</p>
            <p className="text-[11px] text-[#475569] mt-0.5">Uncertain fields below 80% confidence</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#475569] uppercase tracking-wider">Verified Annotations</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#D1FAE5] text-[#065F46]">
                Ground Truth
              </span>
            </div>
            <p className="text-2xl font-extrabold text-[#059669] mt-1.5">{stats.verified_count}</p>
            <p className="text-[11px] text-[#475569] mt-0.5">Accumulated for next active learning run</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#475569] uppercase tracking-wider">Training Flywheel</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                stats.ready_for_training ? "bg-[#DFF3EF] text-[#0F766E]" : "bg-slate-100 text-slate-600"
              }`}>
                {stats.ready_for_training ? "Ready" : "Collecting"}
              </span>
            </div>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold text-[#12304A]">{stats.verified_count}</span>
              <span className="text-xs text-[#475569]">/ {stats.training_threshold} samples</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-2">
              <div
                className="bg-[#0F766E] h-full rounded-full transition-all"
                style={{ width: `${Math.min((stats.verified_count / stats.training_threshold) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Feedback Banner */}
      {feedback && (
        <div className={`p-4 rounded-lg border text-xs font-semibold flex items-center justify-between ${
          feedback.type === "success"
            ? "bg-[#D1FAE5] border-[#A7F3D0] text-[#065F46]"
            : "bg-rose-50 border-rose-200 text-rose-800"
        }`}>
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="opacity-75 hover:opacity-100">
            Dismiss
          </button>
        </div>
      )}

      {/* Queue List */}
      {loading ? (
        <div className="py-20 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#0F766E] mb-2" />
          <p className="text-xs font-semibold text-[#475569]">Loading pending handwriting reviews...</p>
        </div>
      ) : queue.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-12 text-center shadow-xs space-y-3">
          <ShieldCheck className="w-12 h-12 text-[#059669] mx-auto" />
          <h3 className="text-base font-bold text-[#12304A]">Review Queue is Clear</h3>
          <p className="text-xs text-[#475569] max-w-md mx-auto leading-relaxed">
            All low-confidence Kannada handwriting samples have been verified by revenue officers. No items require review at this time.
          </p>
          <div className="pt-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0F766E] hover:bg-[#0D655E] rounded transition-colors"
            >
              Back to Records Registry
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#12304A]">
              Pending Review Items ({queue.length})
            </span>
            <span className="text-xs text-[#475569]">Sorted by lowest confidence score</span>
          </div>

          {queue.map((item) => {
            const isLoading = actionLoading === item.field_id;
            const currentEdit = edits[item.field_id] ?? item.original_value ?? "";

            return (
              <div
                key={item.field_id}
                className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-xs hover:border-[#0F766E]/40 transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E8F0] pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded bg-[#12304A] text-white flex items-center justify-center font-bold text-xs">
                      #{item.field_id}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#12304A]">{item.field_name}</h4>
                      <p className="text-[11px] text-[#475569] font-mono">
                        Record #{item.document_id} &bull; Page {item.source_page} &bull; Script: {item.language_script || "kannada_handwritten"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#475569] font-medium">Confidence:</span>
                    <div className="w-20 bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          item.confidence_score >= 0.8
                            ? "bg-[#059669]"
                            : item.confidence_score >= 0.5
                            ? "bg-[#D97706]"
                            : "bg-[#DC2626]"
                        }`}
                        style={{ width: `${item.confidence_score * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-[#12304A]">
                      {(item.confidence_score * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 bg-[#FAF9F5] p-3.5 rounded-lg border border-[#E2E8F0]">
                    <span className="text-[10px] font-bold text-[#475569] uppercase tracking-wider">
                      Handwriting Crop Preview
                    </span>
                    <div className="h-24 bg-slate-200/60 rounded flex items-center justify-center border border-dashed border-slate-300 overflow-hidden relative">
                      {item.crop_image_path ? (
                        <span className="text-xs font-mono text-slate-600 px-3 truncate">
                          Crop: {item.crop_image_path}
                        </span>
                      ) : (
                        <div className="text-center p-2">
                          <FileText className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                          <span className="text-[11px] text-[#475569]">
                            Bounding box [{item.bounding_box?.x_min.toFixed(2)}, {item.bounding_box?.y_min.toFixed(2)}]
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-[#475569]">
                      <span>Model: {item.model_version || "kannada-trocr-prod-v1.0"}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <span className="text-[10px] font-bold text-[#475569] uppercase tracking-wider">
                        Primary OCR Prediction
                      </span>
                      <div className="p-2.5 bg-[#FAF9F5] rounded text-xs font-bold text-[#12304A] border border-[#CBD5E1] mt-1">
                        {item.original_value || <span className="text-slate-400 italic">Empty OCR Output</span>}
                      </div>
                    </div>

                    {item.candidates && item.candidates.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-[#475569] flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-[#0F766E]" />
                          Alternative Beam Candidates:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {item.candidates.map((cand, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleSelectCandidate(item.field_id, cand.text)}
                              className={`px-2 py-0.5 rounded text-xs font-semibold border transition-colors ${
                                currentEdit === cand.text
                                  ? "bg-[#0F766E] text-white border-[#0F766E]"
                                  : "bg-white text-[#12304A] border-[#CBD5E1] hover:bg-slate-100"
                              }`}
                            >
                              {cand.text}
                              <span className="text-[10px] opacity-75 ml-1">
                                ({(cand.score * 100).toFixed(0)}%)
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[#12304A] uppercase tracking-wider flex items-center gap-1">
                        <Edit3 className="w-3 h-3 text-[#0F766E]" />
                        Verified Ground Truth (Editable Kannada Text):
                      </label>
                      <input
                        type="text"
                        value={currentEdit}
                        onChange={(e) =>
                          setEdits((prev) => ({
                            ...prev,
                            [item.field_id]: e.target.value,
                          }))
                        }
                        placeholder="Enter verified Kannada transcription..."
                        className="w-full px-3 py-1.5 text-xs border border-[#CBD5E1] rounded focus:outline-none focus:ring-1 focus:ring-[#0F766E] font-semibold text-[#12304A]"
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
                  <button
                    onClick={() => handleDecision(item.field_id, "REJECT")}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded hover:bg-rose-100 transition-colors disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>

                  <button
                    onClick={() => handleDecision(item.field_id, "ACCEPT")}
                    disabled={isLoading || !item.original_value}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#065F46] bg-[#D1FAE5] border border-[#A7F3D0] rounded hover:bg-[#A7F3D0] transition-colors disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Accept Prediction</span>
                  </button>

                  <button
                    onClick={() => handleDecision(item.field_id, "CORRECT")}
                    disabled={isLoading || !currentEdit.trim()}
                    className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-[#0F766E] rounded hover:bg-[#0D655E] transition-colors shadow-2xs disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>Save Ground Truth Correction</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
