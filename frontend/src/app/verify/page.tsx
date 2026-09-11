"use client";

import React, { useState } from "react";
import Link from "next/link";
import { verifyRecordSignature } from "@/lib/api";
import { VerificationCheckResult } from "@/lib/types";
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  QrCode,
  Building2,
  Lock,
  Download,
  ExternalLink,
  ChevronRight,
  Loader2,
  Calendar,
  User,
  MapPin,
  Sparkles,
} from "lucide-react";

export default function VerifyRecordPage() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<VerificationCheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  const handleVerify = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const target = customQuery || query;
    if (!target.trim()) return;

    setLoading(true);
    setHasChecked(true);

    try {
      const res = await verifyRecordSignature(target.trim());
      setResult(res);
    } catch (err) {
      console.error("Verification failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const setQuickCheck = (code: string) => {
    setQuery(code);
    handleVerify(undefined, code);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-16">
      {/* 1. Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded bg-[#DFF3EF] text-[#0F766E] text-xs font-bold uppercase tracking-wider">
          <ShieldCheck className="w-3.5 h-3.5" />
          National Authenticity Validation
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#12304A] tracking-tight">
          Verify Official Land Record
        </h1>
        <p className="text-xs sm:text-sm text-[#475569] max-w-lg mx-auto">
          Validate document authenticity, digital sub-registrar seals, and SHA-256 cryptographic signatures against the central registry.
        </p>
      </div>

      {/* 2. Verification Input Form */}
      <form onSubmit={handleVerify} className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-sm space-y-4">
        <label className="block text-xs font-bold text-[#12304A] uppercase tracking-wider">
          Enter Record of Rights (RoR) Number, Record ID, or Digital Hash
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <QrCode className="w-4 h-4 text-[#475569] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. ROR-KA-2026-98124, 1, or 7f6d3b68d46b..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#CBD5E1] rounded text-sm text-[#12304A] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded text-sm font-bold text-white bg-[#0F766E] hover:bg-[#0D655E] shadow-xs flex items-center justify-center gap-2 shrink-0 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            <span>Verify Record</span>
          </button>
        </div>

        {/* Quick Demo Test Codes */}
        <div className="pt-2 border-t border-[#E2E8F0] flex flex-wrap items-center gap-2 text-xs text-[#475569]">
          <span className="text-[11px] font-semibold flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#0F766E]" />
            Quick Demo Codes:
          </span>
          <button
            type="button"
            onClick={() => setQuickCheck("ROR-KA-2026-98124")}
            className="px-2 py-0.5 rounded bg-[#FAF9F5] border border-[#CBD5E1] hover:border-[#0F766E] text-[11px] font-mono font-bold text-[#12304A]"
          >
            ROR-KA-2026-98124 (Valid)
          </button>
          <button
            type="button"
            onClick={() => setQuickCheck("ROR-KA-2026-44012")}
            className="px-2 py-0.5 rounded bg-[#FAF9F5] border border-[#CBD5E1] hover:border-[#0F766E] text-[11px] font-mono font-bold text-[#12304A]"
          >
            ROR-KA-2026-44012 (Valid)
          </button>
          <button
            type="button"
            onClick={() => setQuickCheck("FAKE-REVOKED-HASH-000")}
            className="px-2 py-0.5 rounded bg-rose-50 border border-rose-200 hover:border-rose-400 text-[11px] font-mono font-bold text-rose-800"
          >
            INVALID_HASH (Tamper Demo)
          </button>
        </div>
      </form>

      {/* 3. Verification Outcome State */}
      {hasChecked && result && (
        <div className="space-y-6">
          {result.is_verified ? (
            /* SUCCESS VERIFIED STATE */
            <div className="bg-white rounded-xl border border-[#059669] shadow-sm p-6 sm:p-8 space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-[#D1FAE5] text-[#059669] flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0]">
                    Statutory Verification Confirmed
                  </span>
                  <h2 className="text-xl font-bold text-[#12304A]">
                    Record Verified & Digitally Certified
                  </h2>
                  <p className="text-xs text-[#475569]">
                    The cryptographic signature and digital seal match the official Government of Karnataka cadastral registry.
                  </p>
                </div>
              </div>

              {/* Verified Metadata Card */}
              <div className="p-5 bg-[#FAF9F5] border border-[#E2E8F0] rounded-lg text-xs space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400">Record ID / RoR</span>
                    <p className="font-mono font-bold text-[#12304A] mt-0.5">{result.ror_number}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400">Survey / Hissa</span>
                    <p className="font-mono font-bold text-[#12304A] mt-0.5">{result.survey_number}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400">Khatedar / Owner</span>
                    <p className="font-bold text-[#12304A] mt-0.5">{result.owner_name}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400">Digital Seal</span>
                    <p className="font-mono text-[11px] text-[#059669] font-bold mt-0.5">{result.digital_seal}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E2E8F0] space-y-1">
                  <div className="flex justify-between text-[#475569]">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Issuing Authority:</span>
                    <span className="font-bold text-[#12304A]">{result.issuing_authority}</span>
                  </div>
                  <div className="flex justify-between text-[#475569]">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Verification Timestamp:</span>
                    <span className="font-mono text-[11px] text-slate-700">{new Date(result.verification_timestamp).toLocaleString()}</span>
                  </div>
                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400">SHA-256 Signature Match</span>
                    <p className="font-mono text-[10px] text-slate-600 bg-white p-2 rounded border border-[#E2E8F0] break-all">
                      {result.sha256_hash}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Links */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                <span className="text-[11px] text-[#059669] font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4" />
                  Legally Admissible Proof &bull; DigiLocker Compatible
                </span>
                <Link
                  href={`/search/${result.record_id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded text-xs font-bold text-white bg-[#0F766E] hover:bg-[#0D655E] transition-colors shadow-2xs"
                >
                  <span>View Full Title Record</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            /* FAILURE / NOT FOUND / TAMPERED STATE */
            <div className="bg-white rounded-xl border border-rose-300 shadow-sm p-6 sm:p-8 space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <XCircle className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-100 text-rose-800 border border-rose-200">
                    Verification Failed
                  </span>
                  <h2 className="text-xl font-bold text-[#12304A]">
                    No Valid Official Record Found
                  </h2>
                  <p className="text-xs text-[#475569]">
                    The identifier &ldquo;{query}&rdquo; does not match any certified digital land record or the cryptographic signature has been modified.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-rose-50/60 border border-rose-200 rounded-lg text-xs space-y-2 text-rose-900">
                <div className="flex items-center gap-2 font-bold">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Important Security Notice</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  If you received this physical paper document from a third party, please contact your local Taluk Revenue Office to inspect the original gazette volume. Do not proceed with property transactions until verified.
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setHasChecked(false);
                  }}
                  className="px-4 py-2 rounded text-xs font-bold text-[#12304A] bg-[#FAF9F5] border border-[#CBD5E1] hover:bg-slate-100"
                >
                  Try Another Identifier
                </button>
                <Link
                  href="/digitize"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded text-xs font-bold text-white bg-[#0F766E] hover:bg-[#0D655E]"
                >
                  <span>Digitize Physical Copy</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
