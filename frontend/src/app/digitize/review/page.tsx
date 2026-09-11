"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MOCK_EXTRACTED_LAND_FIELDS } from "@/lib/mock-data";
import {
  ShieldCheck,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Download,
  Check,
  Building2,
  Lock,
  ChevronRight,
  Printer,
  Info,
} from "lucide-react";

export default function DigitizeReviewPage() {
  const router = useRouter();

  // Local state for editable field values initialized from mock data
  const [fields, setFields] = useState<Record<string, string>>({
    owner_name: "B. R. Shivashankaraiah",
    father_name: "Late Ramakrishnaiah",
    survey_number: "142/3A (Hissa 1)",
    land_extent: "2 Acres 14 Guntas",
    village_taluk: "Kenchanakuppe Village, Bidadi Hobli, Ramanagara Taluk",
    registration_date: "1994-08-14",
    land_classification: "Dry Agricultural (Khushki) • Red Loamy Soil",
    revenue_assessment: "INR 24.50 / year",
  });

  const [confirmedMatch, setConfirmedMatch] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [savedDraft, setSavedDraft] = useState(false);

  const handleFieldChange = (key: string, val: string) => {
    setFields((prev) => ({ ...prev, [key]: val }));
  };

  const handleConfirmSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmedMatch) return;
    setIsSubmitted(true);
  };

  const handleSaveDraft = () => {
    setSavedDraft(true);
    setTimeout(() => setSavedDraft(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#DFF3EF] text-[#0F766E] text-[11px] font-bold uppercase tracking-wider">
            <Building2 className="w-3.5 h-3.5" />
            Step 3 of 4: Citizen Verification
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#12304A] tracking-tight mt-1">
            Review Extracted Information
          </h1>
          <p className="text-xs sm:text-sm text-[#475569] mt-0.5">
            We found the following information in your uploaded document. Please check that it matches your physical paper copy before proceeding.
          </p>
        </div>

        <Link
          href="/digitize"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold text-[#475569] bg-white border border-[#CBD5E1] hover:bg-slate-50 transition-colors self-start sm:self-auto"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Go Back</span>
        </Link>
      </div>

      {/* 2. Top Progress Stepper */}
      <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs">
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          {/* Step 1 */}
          <div className="space-y-1.5 border-b-2 border-[#059669] pb-2 text-[#059669]">
            <div className="w-6 h-6 rounded-full bg-[#D1FAE5] text-[#059669] flex items-center justify-center text-[11px] font-bold mx-auto">
              ✓
            </div>
            <span className="font-bold block text-[11px]">1. Uploaded</span>
          </div>

          {/* Step 2 */}
          <div className="space-y-1.5 border-b-2 border-[#059669] pb-2 text-[#059669]">
            <div className="w-6 h-6 rounded-full bg-[#D1FAE5] text-[#059669] flex items-center justify-center text-[11px] font-bold mx-auto">
              ✓
            </div>
            <span className="font-bold block text-[11px]">2. Reading (OCR)</span>
          </div>

          {/* Step 3 */}
          <div className={`space-y-1.5 border-b-2 pb-2 ${isSubmitted ? "border-[#059669] text-[#059669]" : "border-[#0F766E] text-[#0F766E]"}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold mx-auto ${
              isSubmitted ? "bg-[#D1FAE5] text-[#059669]" : "bg-[#0F766E] text-white"
            }`}>
              {isSubmitted ? "✓" : "3"}
            </div>
            <span className="font-bold block text-[11px]">3. Review Details</span>
          </div>

          {/* Step 4 */}
          <div className={`space-y-1.5 border-b-2 pb-2 ${isSubmitted ? "border-[#059669] text-[#059669]" : "border-slate-200 text-[#475569]"}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold mx-auto ${
              isSubmitted ? "bg-[#059669] text-white" : "bg-slate-100 text-[#475569]"
            }`}>
              4
            </div>
            <span className="font-bold block text-[11px]">4. Verify & Issue</span>
          </div>
        </div>
      </div>

      {/* 3. Draft Saved Notification Banner */}
      {savedDraft && (
        <div className="p-4 rounded-lg bg-[#DFF3EF] border border-[#99F6E4] text-[#0F766E] text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Draft record successfully saved locally. You can resume review anytime.</span>
        </div>
      )}

      {/* 4. Issued Certificate Success State (Step 4) */}
      {isSubmitted ? (
        <div className="bg-white rounded-xl border border-[#059669] shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-[#D1FAE5] text-[#059669] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-[#D1FAE5] text-[#065F46]">
                Official Digital Certificate Issued
              </span>
              <h2 className="text-xl font-bold text-[#12304A]">
                Land Record Successfully Verified & Digitized
              </h2>
              <p className="text-xs text-[#475569]">
                Your document has been cryptographically signed and added to the National Digital Land Registry.
              </p>
            </div>
          </div>

          {/* Certificate Summary Card */}
          <div className="p-5 bg-[#FAF9F5] border border-[#E2E8F0] rounded-lg text-xs space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">RoR Number</span>
                <p className="font-mono font-bold text-[#12304A] mt-0.5">ROR-KA-2026-98124</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">Survey / Hissa</span>
                <p className="font-mono font-bold text-[#12304A] mt-0.5">{fields.survey_number}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">Owner Name</span>
                <p className="font-bold text-[#12304A] mt-0.5">{fields.owner_name}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">Digital Seal</span>
                <p className="font-mono text-[11px] text-[#059669] font-bold mt-0.5">SEAL-KA-REV-4091</p>
              </div>
            </div>

            <div className="pt-2 border-t border-[#E2E8F0] space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">SHA-256 Tamper-Proof Signature</span>
              <p className="font-mono text-[10px] text-slate-600 bg-white p-2 rounded border border-[#E2E8F0] break-all">
                7f6d3b68d46b6d9cbbca99141c127d1e4cc9c542c66eec4a214b77b682b4ec88
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <Link
              href="/search"
              className="px-4 py-2.5 rounded text-xs font-bold text-[#12304A] bg-[#FAF9F5] border border-[#CBD5E1] hover:bg-slate-100 transition-colors"
            >
              Back to Search Records
            </Link>

            <div className="flex items-center gap-3">
              <Link
                href="/search/1"
                className="px-4 py-2.5 rounded text-xs font-bold text-[#12304A] bg-white border border-[#CBD5E1] hover:bg-slate-50 transition-colors"
              >
                View Full Title Certificate
              </Link>
              <button
                onClick={() => alert("Digital copy downloaded to your device.")}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded text-xs font-bold text-white bg-[#0F766E] hover:bg-[#0D655E] transition-colors shadow-2xs"
              >
                <Download className="w-4 h-4" />
                <span>Download Official Certificate (PDF)</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Form Review Content */
        <form onSubmit={handleConfirmSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Uploaded Document Card */}
            <div className="lg:col-span-4 bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs space-y-4 text-xs h-fit">
              <div className="flex items-center gap-2 pb-2 border-b border-[#E2E8F0]">
                <FileText className="w-4 h-4 text-[#0F766E]" />
                <h3 className="font-bold text-[#12304A]">Uploaded Land Document</h3>
              </div>

              {/* Document Thumbnail / Placeholder */}
              <div className="h-44 bg-[#FAF9F5] border border-dashed border-[#CBD5E1] rounded flex flex-col items-center justify-center p-3 text-center space-y-2">
                <FileText className="w-8 h-8 text-[#0F766E]/60" />
                <p className="text-[11px] font-bold text-[#12304A] truncate max-w-[200px]">
                  KA_Bidadi_Sy142_3A_RTC.pdf
                </p>
                <span className="px-2 py-0.5 rounded bg-[#DFF3EF] text-[#0F766E] text-[10px] font-bold">
                  2 Pages &bull; Scanned Kannada RTC
                </span>
              </div>

              <div className="space-y-2 text-[11px]">
                <div className="flex justify-between text-[#475569]">
                  <span>Overall AI Confidence:</span>
                  <strong className="text-[#059669]">96.8% High</strong>
                </div>
                <div className="flex justify-between text-[#475569]">
                  <span>Language Script:</span>
                  <strong className="text-[#12304A]">Kannada (Indic OCR)</strong>
                </div>
                <div className="flex justify-between text-[#475569]">
                  <span>Cadastral Rules:</span>
                  <strong className="text-[#059669]">4/4 Checks Passed</strong>
                </div>
              </div>

              <div className="pt-2 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => alert("Opening original scanned image preview.")}
                  className="w-full py-2 px-3 rounded text-xs font-bold text-[#12304A] bg-[#FAF9F5] border border-[#CBD5E1] hover:bg-slate-100 transition-colors flex items-center justify-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-[#0F766E]" />
                  <span>View Original Scanned Copy</span>
                </button>
              </div>
            </div>

            {/* Right Column: Editable Extracted Land Record Fields */}
            <div className="lg:col-span-8 bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                <h3 className="text-sm font-bold text-[#12304A]">
                  Extracted Land Record Entities
                </h3>
                <span className="text-[11px] text-[#475569]">
                  Click any field to edit or correct spelling
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Field 1: Owner Name */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-[#12304A] text-[11px]">
                      Owner Name (Record of Rights)
                    </label>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#D1FAE5] text-[#065F46]">
                      98% Conf
                    </span>
                  </div>
                  <input
                    type="text"
                    value={fields.owner_name}
                    onChange={(e) => handleFieldChange("owner_name", e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded text-xs font-semibold text-[#12304A] focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
                  />
                </div>

                {/* Field 2: Father / Guardian */}
                <div className="space-y-1">
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
                    value={fields.father_name}
                    onChange={(e) => handleFieldChange("father_name", e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded text-xs font-semibold text-[#12304A] focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
                  />
                </div>

                {/* Field 3: Survey Number */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-[#12304A] text-[11px]">
                      Survey / Khasra Number
                    </label>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#D1FAE5] text-[#065F46]">
                      99% Conf
                    </span>
                  </div>
                  <input
                    type="text"
                    value={fields.survey_number}
                    onChange={(e) => handleFieldChange("survey_number", e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded text-xs font-mono font-bold text-[#12304A] focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
                  />
                </div>

                {/* Field 4: Land Area */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-[#12304A] text-[11px]">
                      Land Area / Extent
                    </label>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#D1FAE5] text-[#065F46]">
                      97% Conf
                    </span>
                  </div>
                  <input
                    type="text"
                    value={fields.land_extent}
                    onChange={(e) => handleFieldChange("land_extent", e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded text-xs font-semibold text-[#12304A] focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
                  />
                </div>

                {/* Field 5: Village & Taluk */}
                <div className="space-y-1 sm:col-span-2">
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
                    value={fields.village_taluk}
                    onChange={(e) => handleFieldChange("village_taluk", e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded text-xs font-semibold text-[#12304A] focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
                  />
                </div>

                {/* Field 6: Registration Date */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-[#12304A] text-[11px]">
                      Registration Date
                    </label>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#D1FAE5] text-[#065F46]">
                      95% Conf
                    </span>
                  </div>
                  <input
                    type="text"
                    value={fields.registration_date}
                    onChange={(e) => handleFieldChange("registration_date", e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded text-xs font-semibold text-[#12304A] focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
                  />
                </div>

                {/* Field 7: Revenue Assessment (LOW CONFIDENCE WARNING DEMO) */}
                <div className="space-y-1 p-2.5 bg-[#FEF3C7]/40 border border-[#FDE68A] rounded">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-[#92400E] text-[11px] flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-[#D97706]" />
                      Annual Land Revenue
                    </label>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FEF3C7] text-[#92400E]">
                      78% Low Conf
                    </span>
                  </div>
                  <input
                    type="text"
                    value={fields.revenue_assessment}
                    onChange={(e) => handleFieldChange("revenue_assessment", e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded text-xs font-semibold text-[#12304A] focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
                  />
                  <p className="text-[10px] text-[#92400E]">
                    Please verify revenue amount against original paper seal.
                  </p>
                </div>

                {/* Field 8: Land Classification */}
                <div className="space-y-1 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-[#12304A] text-[11px]">
                      Land Classification & Soil Type
                    </label>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#D1FAE5] text-[#065F46]">
                      94% Conf
                    </span>
                  </div>
                  <input
                    type="text"
                    value={fields.land_classification}
                    onChange={(e) => handleFieldChange("land_classification", e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded text-xs font-semibold text-[#12304A] focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
                  />
                </div>
              </div>

              {/* Statutory Checks */}
              <div className="p-3.5 bg-[#FAF9F5] border border-[#E2E8F0] rounded-lg space-y-2 text-xs">
                <span className="font-bold text-[#12304A] flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-[#059669]" />
                  Statutory Cadastral Validation Rules
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
                    <span>Survey number syntax valid (Sec-108A)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
                    <span>Area extent balances (2 Acres 14 Guntas)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
                    <span>Village revenue inspector seal recognized</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
                    <span>DigiLocker schema compatibility verified</span>
                  </div>
                </div>
              </div>

              {/* Citizen Confirmation Checkbox */}
              <div className="pt-2">
                <label className="flex items-start gap-3 p-3.5 bg-[#FAF9F5] border border-[#CBD5E1] rounded-lg cursor-pointer hover:bg-slate-100">
                  <input
                    type="checkbox"
                    checked={confirmedMatch}
                    onChange={(e) => setConfirmedMatch(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-[#0F766E] rounded border-slate-300 focus:ring-[#0F766E]"
                  />
                  <span className="text-xs font-semibold text-[#12304A] leading-snug">
                    I confirm these extracted details match my physical paper document and are true to official land revenue records.
                  </span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#E2E8F0]">
                <Link
                  href="/digitize"
                  className="px-4 py-2 rounded text-xs font-bold text-[#475569] bg-[#FAF9F5] border border-[#CBD5E1] hover:bg-slate-100"
                >
                  Go Back
                </Link>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    className="px-4 py-2 rounded text-xs font-bold text-[#12304A] bg-white border border-[#CBD5E1] hover:bg-slate-50 transition-colors"
                  >
                    Save Draft
                  </button>

                  <button
                    type="submit"
                    disabled={!confirmedMatch}
                    className="px-5 py-2.5 rounded text-xs font-bold text-white bg-[#0F766E] hover:bg-[#0D655E] disabled:opacity-50 disabled:cursor-not-allowed shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Confirm & Submit for Verification</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
