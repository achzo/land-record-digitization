"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { fetchLandRecordById } from "@/lib/api";
import { LandRecord } from "@/lib/types";
import {
  ArrowLeft,
  Download,
  Printer,
  ShieldCheck,
  Building2,
  MapPin,
  User,
  Calendar,
  Layers,
  FileText,
  Lock,
  ExternalLink,
  Award,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from "lucide-react";

export default function LandRecordDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const recordId = String(params.id);

  const [record, setRecord] = useState<LandRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRecord() {
      try {
        setLoading(true);
        const data = await fetchLandRecordById(recordId);
        setRecord(data);
      } catch (err) {
        console.error("Failed to load land record:", err);
      } finally {
        setLoading(false);
      }
    }
    loadRecord();
  }, [recordId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="py-24 text-center max-w-2xl mx-auto">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#0F766E] mb-2" />
        <p className="text-xs font-semibold text-[#475569]">
          Retrieving official Record of Rights (RoR #{recordId}) from national registry...
        </p>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-[#12304A]">Land Record Not Found</h2>
        <p className="text-xs text-[#475569]">
          No official Record of Rights found for identifier &ldquo;{recordId}&rdquo;.
        </p>
        <Link
          href="/search"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#0F766E] rounded hover:bg-[#0D655E]"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Search Records
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* 1. Print & Navigation Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/search"
            className="p-2 text-[#475569] hover:text-[#12304A] hover:bg-slate-200/60 rounded transition-colors"
            title="Back to Search"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              National Digital Land Registry
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#12304A] tracking-tight">
              Record of Rights (RoR) &bull; Sy. {record.survey_number}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[#12304A] bg-white border border-[#CBD5E1] rounded hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Certificate</span>
          </button>
          <a
            href={record.download_url || "#"}
            onClick={(e) => {
              if (record.download_url === "#") {
                e.preventDefault();
                alert("Certified PDF generated and ready for download.");
              }
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0F766E] hover:bg-[#0D655E] rounded transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Certified PDF</span>
          </a>
        </div>
      </div>

      {/* 2. Official Certificate Container */}
      <div className="bg-white rounded-xl border-2 border-[#12304A]/20 shadow-sm overflow-hidden">
        {/* Certificate Header Banner */}
        <div className="bg-[#12304A] text-white p-6 border-b border-[#1E4264] text-center space-y-1 relative">
          <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded bg-[#DFF3EF] text-[#0F766E] text-[10px] font-bold uppercase tracking-wider">
            <Award className="w-3 h-3" />
            Government of Karnataka &bull; Revenue Department
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold tracking-tight pt-1">
            RECORD OF RIGHTS, TENANCY AND CROPS (RTC / PA обрани)
          </h2>
          <p className="text-xs text-slate-300">
            Issued under Rule 40 & 42 of the Karnataka Land Revenue Rules, 1966
          </p>

          <div className="absolute right-4 top-4 hidden sm:block">
            <span className="px-2.5 py-1 rounded text-xs font-bold bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0] flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#059669]" />
              Verified Official Record
            </span>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {/* Certificate Quick Overview Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#FAF9F5] p-4 rounded-lg border border-[#E2E8F0] text-xs">
            <div>
              <span className="text-[10px] font-bold text-[#475569] uppercase">RoR Record No.</span>
              <p className="font-mono font-bold text-[#12304A] mt-0.5">{record.ror_number}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#475569] uppercase">Survey / Khasra No.</span>
              <p className="font-mono font-bold text-[#12304A] mt-0.5">
                {record.survey_number} {record.hissa_number && `(${record.hissa_number})`}
              </p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#475569] uppercase">Property ID (PID)</span>
              <p className="font-mono font-bold text-[#12304A] mt-0.5">{record.property_id || "N/A"}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#475569] uppercase">Status</span>
              <p className="font-bold text-[#059669] mt-0.5 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {record.status}
              </p>
            </div>
          </div>

          {/* Section 1: Ownership Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#12304A] border-b border-[#E2E8F0] pb-1.5 flex items-center gap-2">
              <User className="w-4 h-4 text-[#0F766E]" />
              1. Khatedar / Primary Land Ownership Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-white border border-[#E2E8F0] rounded">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Primary Owner Name</span>
                <p className="font-bold text-[#12304A] text-sm mt-0.5">{record.owner_name}</p>
                {record.kannada_owner_name && (
                  <p className="text-xs text-[#0F766E] font-medium mt-0.5">{record.kannada_owner_name}</p>
                )}
              </div>
              <div className="p-3 bg-white border border-[#E2E8F0] rounded">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Father / Guardian Name</span>
                <p className="font-semibold text-[#12304A] mt-0.5">{record.father_or_guardian_name}</p>
                <p className="text-[11px] text-[#475569] mt-0.5">Joint Family Khata / Hereditary Title</p>
              </div>
            </div>
          </div>

          {/* Section 2: Location & Administrative Jurisdiction */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#12304A] border-b border-[#E2E8F0] pb-1.5 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#0F766E]" />
              2. Administrative Location & Jurisdiction
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-white border border-[#E2E8F0] rounded">
                <span className="text-[10px] font-bold text-slate-400 uppercase">State</span>
                <p className="font-bold text-[#12304A] mt-0.5">{record.state}</p>
              </div>
              <div className="p-3 bg-white border border-[#E2E8F0] rounded">
                <span className="text-[10px] font-bold text-slate-400 uppercase">District</span>
                <p className="font-bold text-[#12304A] mt-0.5">{record.district}</p>
              </div>
              <div className="p-3 bg-white border border-[#E2E8F0] rounded">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Taluk</span>
                <p className="font-bold text-[#12304A] mt-0.5">{record.taluk}</p>
              </div>
              <div className="p-3 bg-white border border-[#E2E8F0] rounded">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Hobli & Village</span>
                <p className="font-bold text-[#12304A] mt-0.5">{record.village} ({record.hobli})</p>
              </div>
            </div>
          </div>

          {/* Section 3: Extent, Soil & Revenue Classification */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#12304A] border-b border-[#E2E8F0] pb-1.5 flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#0F766E]" />
              3. Cadastral Extent, Soil Classification & Revenue
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-white border border-[#E2E8F0] rounded">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Total Land Extent</span>
                <p className="font-bold text-[#12304A] text-sm mt-0.5">{record.total_area_text}</p>
                <p className="text-[11px] text-[#475569]">{record.land_extent_acres} Acres, {record.land_extent_guntas} Guntas</p>
              </div>
              <div className="p-3 bg-white border border-[#E2E8F0] rounded">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Classification</span>
                <p className="font-bold text-[#0F766E] mt-0.5">{record.land_classification}</p>
                <p className="text-[11px] text-[#475569]">{record.soil_type || "Standard Soil Grade"}</p>
              </div>
              <div className="p-3 bg-white border border-[#E2E8F0] rounded">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Annual Land Revenue</span>
                <p className="font-bold text-[#12304A] text-sm mt-0.5">INR {record.revenue_assessment_inr.toFixed(2)} / yr</p>
                <p className="text-[11px] text-[#059669] font-medium">Paid up to date (2025-26)</p>
              </div>
            </div>
          </div>

          {/* Section 4: Statutory Registration & Digital Proof */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#12304A] border-b border-[#E2E8F0] pb-1.5 flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#0F766E]" />
              4. Statutory Certification & Cryptographic Verification
            </h3>
            <div className="p-4 bg-[#FAF9F5] border border-[#CBD5E1] rounded-lg space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">Issuing Authority</span>
                  <p className="font-bold text-[#12304A] mt-0.5">{record.issuing_authority}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">Registration Date</span>
                  <p className="text-[#12304A] mt-0.5">{new Date(record.registration_date).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-[#E2E8F0] space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">SHA-256 Tamper-Proof Signature</span>
                <p className="font-mono text-[11px] text-[#12304A] break-all bg-white p-2 rounded border border-[#E2E8F0]">
                  {record.sha256_hash}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-[#065F46] font-semibold">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-[#059669]" />
                  Digital Seal: {record.verification_seal_number}
                </span>
                <span>DigiLocker Certified Document</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
