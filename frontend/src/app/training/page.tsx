"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  fetchTrainingStatus,
  fetchTrainingRuns,
  triggerTraining,
  promoteCandidateRun,
  rejectCandidateRun,
  rollbackCheckpoint,
  fetchRunEvaluation,
} from "@/lib/api";
import {
  TrainingStatusResponse,
  TrainingRunItem,
  EvaluationResponse,
} from "@/lib/types";
import {
  Layers,
  Sparkles,
  RefreshCw,
  Play,
  CheckCircle2,
  XCircle,
  RotateCcw,
  AlertTriangle,
  Award,
  ChevronRight,
  Shield,
  Loader2,
  Cpu,
  Building2,
} from "lucide-react";

export default function ModelRegistryPage() {
  const [status, setStatus] = useState<TrainingStatusResponse | null>(null);
  const [runs, setRuns] = useState<TrainingRunItem[]>([]);
  const [evaluations, setEvaluations] = useState<Record<number, EvaluationResponse>>({});
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [evalLoading, setEvalLoading] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [statusRes, runsRes] = await Promise.all([
        fetchTrainingStatus(),
        fetchTrainingRuns(),
      ]);
      setStatus(statusRes);
      setRuns(runsRes);
    } catch (err: any) {
      console.error("Failed to load training status/runs:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTriggerTraining = async () => {
    setTriggering(true);
    setFeedback(null);
    try {
      const res = await triggerTraining("Retraining on newly verified human annotations");
      setFeedback({
        message: res.message || "Training run initiated successfully",
        type: "success",
      });
      await loadData();
    } catch (err: any) {
      setFeedback({
        message: err.message || "Failed to trigger training run",
        type: "error",
      });
    } finally {
      setTriggering(false);
    }
  };

  const handleLoadEvaluation = async (runId: number) => {
    setEvalLoading(runId);
    try {
      const res = await fetchRunEvaluation(runId);
      setEvaluations((prev) => ({ ...prev, [runId]: res }));
    } catch (err: any) {
      setFeedback({
        message: err.message || "Failed to fetch candidate evaluation",
        type: "error",
      });
    } finally {
      setEvalLoading(null);
    }
  };

  const handlePromote = async (runId: number) => {
    setActionLoading(runId);
    setFeedback(null);
    try {
      const res = await promoteCandidateRun(runId, false);
      setFeedback({
        message: res.message || "Successfully promoted candidate to production!",
        type: "success",
      });
      await loadData();
    } catch (err: any) {
      setFeedback({
        message: err.message || "Failed to promote candidate run",
        type: "error",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (runId: number) => {
    setActionLoading(runId);
    setFeedback(null);
    try {
      const res = await rejectCandidateRun(runId, "Model candidate rejected by administrator");
      setFeedback({
        message: res.message || "Candidate run rejected.",
        type: "success",
      });
      await loadData();
    } catch (err: any) {
      setFeedback({
        message: err.message || "Failed to reject candidate run",
        type: "error",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRollback = async (checkpointId: number) => {
    if (!confirm("Are you sure you want to rollback production to this checkpoint?")) return;
    setActionLoading(checkpointId);
    setFeedback(null);
    try {
      const res = await rollbackCheckpoint(checkpointId);
      setFeedback({
        message: res.message || "Production model successfully rolled back!",
        type: "success",
      });
      await loadData();
    } catch (err: any) {
      setFeedback({
        message: err.message || "Failed to rollback checkpoint",
        type: "error",
      });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#DFF3EF] text-[#0F766E] text-[11px] font-bold uppercase tracking-wider">
            <Cpu className="w-3.5 h-3.5" />
            Indic Spatial OCR Model Lifecycle
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#12304A] tracking-tight mt-1">
            Model Registry & Active Learning
          </h1>
          <p className="text-xs text-[#475569] mt-0.5">
            Gated promotion lifecycle for fine-tuned Kannada TrOCR models. Human-verified samples form the ground truth dataset.
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
          <button
            onClick={handleTriggerTraining}
            disabled={triggering || !status?.ready_to_train}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#0F766E] rounded hover:bg-[#0D655E] transition-colors shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {triggering ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>Trigger Candidate Training</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-lg border text-xs font-semibold flex items-center justify-between ${
            feedback.type === "success"
              ? "bg-[#D1FAE5] border-[#A7F3D0] text-[#065F46]"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="opacity-75 hover:opacity-100">
            Dismiss
          </button>
        </div>
      )}

      {/* Production Status Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs md:col-span-2 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#475569] uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-[#059669]" />
                Active Production Model Checkpoint
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#D1FAE5] text-[#065F46] flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                SERVING TRAFFIC
              </span>
            </div>
            <div className="pt-2">
              <h3 className="text-base font-bold text-[#12304A] font-mono">
                {status?.current_production_checkpoint || "kannada-trocr-prod-v1.0 (Base Default)"}
              </h3>
              <p className="text-[11px] text-[#475569] mt-0.5 font-mono">
                Path: {status?.production_checkpoint_path || "models/kannada_trocr/production"}
              </p>
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#475569]">
            <span>Production Checkpoint is Protected</span>
            <span className="text-[#059669] font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Verified Safe
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#475569] uppercase tracking-wider">
                Training Flywheel
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  status?.ready_to_train ? "bg-[#DFF3EF] text-[#0F766E]" : "bg-slate-100 text-slate-600"
                }`}
              >
                {status?.ready_to_train ? "Threshold Met" : "Accumulating"}
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-[#12304A]">{status?.verified_samples_count || 0}</span>
              <span className="text-xs font-semibold text-[#475569]">
                / {status?.min_verified_samples_for_training || 20} samples
              </span>
            </div>
            <p className="text-[11px] text-[#475569]">
              Human-verified annotations from the review queue feed candidate fine-tuning.
            </p>
          </div>

          <div className="space-y-1.5 pt-3">
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#0F766E] h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(((status?.verified_samples_count || 0) / (status?.min_verified_samples_for_training || 20)) * 100, 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Candidate Runs List */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#12304A]">
          Candidate Fine-Tuning Runs & Benchmarks
        </h3>

        {loading ? (
          <div className="py-12 text-center bg-white rounded-xl border border-[#E2E8F0]">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#0F766E] mb-2" />
            <p className="text-xs font-semibold text-[#475569]">Loading candidate training history...</p>
          </div>
        ) : runs.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-8 text-center space-y-2">
            <Cpu className="w-8 h-8 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-[#12304A]">No Active Candidate Runs</h4>
            <p className="text-xs text-[#475569] max-w-sm mx-auto">
              Once {status?.min_verified_samples_for_training || 20} verified annotations are gathered, a candidate run can be triggered.
            </p>
            <div className="pt-2">
              <Link
                href="/review"
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-[#0F766E] bg-[#DFF3EF] rounded hover:bg-[#99F6E4]"
              >
                Go to Review Queue
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {runs.map((run) => {
              const runEval = evaluations[run.id];
              const isPromoting = actionLoading === run.id;

              return (
                <div
                  key={run.id}
                  className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded bg-[#12304A] text-white flex items-center justify-center font-bold text-xs">
                        #{run.id}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-[#12304A] font-mono">
                            {run.candidate_version_tag || `run-${run.id}`}
                          </h4>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#DFF3EF] text-[#0F766E]">
                            {run.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#475569] font-mono mt-0.5">
                          Samples: {run.num_samples_used} &bull; Base: {run.base_checkpoint}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!runEval && (
                        <button
                          onClick={() => handleLoadEvaluation(run.id)}
                          disabled={evalLoading === run.id}
                          className="px-3 py-1.5 text-xs font-bold text-[#12304A] bg-[#FAF9F5] border border-[#CBD5E1] rounded hover:bg-slate-100 transition-colors"
                        >
                          {evalLoading === run.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin inline mr-1" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5 inline mr-1 text-[#0F766E]" />
                          )}
                          Compare Metrics
                        </button>
                      )}

                      {run.status === "COMPLETED" && (
                        <>
                          <button
                            onClick={() => handleReject(run.id)}
                            disabled={isPromoting}
                            className="px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded hover:bg-rose-100 transition-colors"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handlePromote(run.id)}
                            disabled={isPromoting}
                            className="px-3 py-1.5 text-xs font-bold text-white bg-[#059669] rounded hover:bg-[#047857] transition-colors shadow-2xs disabled:opacity-50"
                          >
                            {isPromoting ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin inline mr-1" />
                            ) : (
                              <Award className="w-3.5 h-3.5 inline mr-1" />
                            )}
                            Promote to Production
                          </button>
                        </>
                      )}

                      {run.candidate_checkpoint_id && run.status === "ARCHIVED" && (
                        <button
                          onClick={() => handleRollback(run.candidate_checkpoint_id!)}
                          className="px-3 py-1.5 text-xs font-bold text-[#475569] bg-slate-100 rounded hover:bg-slate-200 transition-colors flex items-center gap-1"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Rollback
                        </button>
                      )}
                    </div>
                  </div>

                  {runEval && (
                    <div className="bg-[#DFF3EF]/40 border border-[#99F6E4] rounded-lg p-3.5 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#12304A] flex items-center gap-1.5">
                          <Award className="w-4 h-4 text-[#0F766E]" />
                          Gated Assessment
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          runEval.recommend_promotion ? "bg-[#D1FAE5] text-[#065F46]" : "bg-[#FEF3C7] text-[#92400E]"
                        }`}>
                          {runEval.recommend_promotion ? "ELIGIBLE FOR PROMOTION" : "NOT ELIGIBLE"}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#475569] space-y-1">
                        {runEval.reasons.map((r, idx) => (
                          <div key={idx} className="flex items-center gap-1">
                            {runEval.recommend_promotion ? (
                              <CheckCircle2 className="w-3 h-3 text-[#059669] shrink-0" />
                            ) : (
                              <AlertTriangle className="w-3 h-3 text-[#D97706] shrink-0" />
                            )}
                            <span>{r}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
