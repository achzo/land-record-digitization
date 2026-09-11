"use client";

import React, { useState } from "react";
import Link from "next/link";
import { trackApplicationStatus } from "@/lib/api";
import { TrackingApplication } from "@/lib/types";
import {
  Clock,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  ShieldCheck,
  Building2,
  ChevronRight,
  Loader2,
  Sparkles,
  PhoneCall,
} from "lucide-react";

export default function TrackRequestPage() {
  const [query, setQuery] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [application, setApplication] = useState<TrackingApplication | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleTrack = async (e?: React.FormEvent, customId?: string) => {
    if (e) e.preventDefault();
    const targetId = customId || query;
    if (!targetId.trim()) return;

    setLoading(true);
    setErrorMessage(null);
    setHasSearched(true);

    try {
      const data = await trackApplicationStatus(targetId.trim());
      if (data) {
        setApplication(data);
      } else {
        setApplication(null);
        setErrorMessage(`No application found matching Request ID "${targetId}".`);
      }
    } catch (err: any) {
      setApplication(null);
      setErrorMessage(err.message || "Failed to query application status.");
    } finally {
      setLoading(false);
    }
  };

  const setQuickTrack = (id: string) => {
    setQuery(id);
    handleTrack(undefined, id);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-16">
      {/* 1. Page Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded bg-[#DFF3EF] text-[#0F766E] text-xs font-bold uppercase tracking-wider">
          <Clock className="w-3.5 h-3.5" />
          Real-Time Citizen Tracking Desk
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#12304A] tracking-tight">
          Track Your Request
        </h1>
        <p className="text-xs sm:text-sm text-[#475569] max-w-lg mx-auto">
          Check the real-time status of your digitized documents, automated Indic OCR processing, and official verification.
        </p>
      </div>

      {/* 2. Search Input Form */}
      <form onSubmit={handleTrack} className="bg-white p-6 sm:p-7 rounded-xl border border-[#E2E8F0] shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-[#12304A] uppercase tracking-wider">
              Request ID / Application Number
            </label>
            <div className="relative">
              <Clock className="w-4 h-4 text-[#475569] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. REQ-KA-2026-001 or 1..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-[#CBD5E1] rounded text-xs text-[#12304A] placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-[#12304A] uppercase tracking-wider">
              Registered Mobile Number (Optional)
            </label>
            <div className="relative">
              <PhoneCall className="w-4 h-4 text-[#475569] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                placeholder="e.g. 9876543210"
                className="w-full pl-10 pr-4 py-2 bg-white border border-[#CBD5E1] rounded text-xs text-[#12304A] placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 rounded text-xs font-bold text-white bg-[#0F766E] hover:bg-[#0D655E] shadow-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          <span>Track Application Status</span>
        </button>

        {/* Quick Demo Test Buttons */}
        <div className="pt-2 border-t border-[#E2E8F0] flex flex-wrap items-center gap-2 text-xs text-[#475569]">
          <span className="text-[11px] font-semibold flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#0F766E]" />
            Quick Demo IDs:
          </span>
          <button
            type="button"
            onClick={() => setQuickTrack("REQ-KA-2026-001")}
            className="px-2 py-0.5 rounded bg-[#FAF9F5] border border-[#CBD5E1] hover:border-[#0F766E] text-[11px] font-mono font-bold text-[#12304A]"
          >
            REQ-KA-2026-001 (Completed)
          </button>
          <button
            type="button"
            onClick={() => setQuickTrack("REQ-KA-2026-002")}
            className="px-2 py-0.5 rounded bg-[#FAF9F5] border border-[#CBD5E1] hover:border-[#0F766E] text-[11px] font-mono font-bold text-[#12304A]"
          >
            REQ-KA-2026-002 (In Review)
          </button>
        </div>
      </form>

      {/* 3. Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 4. Tracking Status Card */}
      {application && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6 sm:p-8 space-y-6">
          {/* Status Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Application Number</span>
              <h3 className="text-xl font-bold text-[#12304A] font-mono">{application.request_id}</h3>
              <p className="text-xs text-[#475569] mt-0.5">{application.document_type} &bull; Sy. {application.survey_number}</p>
            </div>

            <span className={`px-3 py-1 rounded text-xs font-bold ${
              application.current_status === "Completed"
                ? "bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0]"
                : "bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]"
            }`}>
              {application.current_status}
            </span>
          </div>

          {/* Request Overview Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs bg-[#FAF9F5] p-4 rounded-lg border border-[#E2E8F0]">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400">Primary Holder</span>
              <p className="font-bold text-[#12304A] mt-0.5">{application.owner_name}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400">Location</span>
              <p className="text-[#12304A] mt-0.5">{application.location}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400">Submission Date</span>
              <p className="text-[#12304A] mt-0.5">{application.submission_date}</p>
            </div>
          </div>

          {/* 5-Stage Timeline Stepper */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-[#12304A] uppercase tracking-wider">
              Digitization & Verification Timeline
            </h4>

            <div className="space-y-4 pt-1">
              {application.steps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-3.5">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    step.status === "completed"
                      ? "bg-[#D1FAE5] text-[#059669]"
                      : step.status === "current"
                      ? "bg-[#FEF3C7] text-[#D97706]"
                      : "bg-slate-100 text-slate-400"
                  }`}>
                    {step.status === "completed" ? "✓" : idx + 1}
                  </div>
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-[#12304A]">{step.title}</h5>
                      <span className="text-[11px] text-slate-400 font-mono">{step.timestamp}</span>
                    </div>
                    <p className="text-[11px] text-[#475569]">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Link */}
          <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-between">
            <span className="text-[11px] text-[#475569]">
              Certified by Dept. of Land Resources
            </span>
            <Link
              href={application.record_id ? `/search/${application.record_id}` : "/search"}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded text-xs font-bold text-white bg-[#0F766E] hover:bg-[#0D655E] transition-colors"
            >
              <span>View Verified Title Record</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
