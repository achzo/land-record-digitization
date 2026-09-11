"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { LandRecord } from "@/lib/types";
import { searchLandRecords } from "@/lib/api";
import {
  Search,
  UploadCloud,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  Award,
  Layers,
  PhoneCall,
  Download,
  Building2,
  Lock,
  ExternalLink,
  ChevronRight,
  FileCheck2,
  HelpCircle,
  QrCode,
} from "lucide-react";

export default function HomePage() {
  const [featuredRecords, setFeaturedRecords] = useState<LandRecord[]>([]);

  useEffect(() => {
    async function loadInitial() {
      try {
        const records = await searchLandRecords({ search_type: "survey", query: "" });
        setFeaturedRecords(records);
      } catch (e) {
        console.error("Failed to load initial records:", e);
      }
    }
    loadInitial();
  }, []);

  return (
    <div className="space-y-16 pb-12">
      {/* 1. HERO SECTION */}
      <section className="relative pt-4 pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Hero Content */}
          <div className="lg:col-span-7 space-y-6">
            {/* National Mission Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#DFF3EF] text-[#0F766E] border border-[#99F6E4] text-xs font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-[#0F766E]" />
              National Digital Land Mission
            </div>

            {/* Main Headline */}
            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#12304A] tracking-tight leading-[1.15]">
                Access Your Land Records Digitally
              </h1>
              <p className="text-base sm:text-lg text-[#475569] leading-relaxed max-w-xl">
                Search, verify, and digitize your official land records securely from anywhere with spatial Indic AI document intelligence.
              </p>
            </div>

            {/* Hero CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/search"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded text-sm font-bold text-white bg-[#0F766E] hover:bg-[#0D655E] shadow-sm transition-all"
              >
                <Search className="w-4 h-4" />
                <span>Search Land Record</span>
              </Link>
              <Link
                href="/digitize"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded text-sm font-bold text-[#12304A] bg-white border border-[#CBD5E1] hover:bg-[#FAF9F5] hover:border-[#94A3B8] shadow-xs transition-all"
              >
                <UploadCloud className="w-4 h-4 text-[#0F766E]" />
                <span>Digitize Old Document</span>
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="pt-4 flex flex-wrap items-center gap-6 text-xs text-[#475569] border-t border-[#E2E8F0]">
              <div className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-4 h-4 text-[#059669]" />
                <span>NIC Certified Security</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <Award className="w-4 h-4 text-[#059669]" />
                <span>Legally Admissible Proof</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <Lock className="w-4 h-4 text-[#059669]" />
                <span>SHA-256 Anti-Tamper Signatures</span>
              </div>
            </div>
          </div>

          {/* Right Hero Preview Card: Digital Title Record */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
              {/* Card Header Strip */}
              <div className="bg-[#12304A] text-white px-5 py-3 flex items-center justify-between border-b border-[#1E4264]">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-[#0F766E] flex items-center justify-center text-[10px] font-bold text-white">
                    ಭೂ
                  </div>
                  <div>
                    <h3 className="text-xs font-bold tracking-tight">Digital Title Record (RoR)</h3>
                    <p className="text-[10px] text-slate-300">Govt. of Karnataka &bull; Revenue Dept.</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#D1FAE5] text-[#065F46]">
                  Verified
                </span>
              </div>

              {/* Record Summary Table */}
              <div className="p-5 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3 pb-3 border-b border-[#E2E8F0]">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#475569]">RoR Record No.</span>
                    <p className="font-mono font-bold text-[#12304A] mt-0.5">ROR-KA-2026-98124</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#475569]">Survey / Khasra No.</span>
                    <p className="font-mono font-bold text-[#12304A] mt-0.5">142/3A (Hissa 1)</p>
                  </div>
                </div>

                <div className="space-y-2 pb-3 border-b border-[#E2E8F0]">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#475569]">Primary Land Owner</span>
                    <p className="font-semibold text-[#12304A] text-sm">B. R. Shivashankaraiah</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#475569]">Taluk & Village</span>
                      <p className="text-[#12304A]">Bidadi, Ramanagara</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#475569]">Land Extent</span>
                      <p className="text-[#12304A] font-semibold">2 Acres 14 Guntas</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#475569] bg-[#FAF9F5] p-2.5 rounded border border-[#E2E8F0]">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#059669]" />
                    <span>Issuing Authority: <strong>Tahsildar Ramanagara</strong></span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400">Sec-108A</span>
                </div>

                <div className="pt-1 flex items-center justify-between">
                  <Link
                    href="/search/1"
                    className="text-xs font-bold text-[#0F766E] hover:underline flex items-center gap-1"
                  >
                    <span>View Full Certificate Details</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                  <Link
                    href="/verify"
                    className="px-3 py-1.5 rounded text-xs font-semibold text-[#12304A] bg-[#FAF9F5] border border-[#CBD5E1] hover:bg-[#E2E8F0]/60 transition-colors"
                  >
                    Verify Seal
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. HOW CAN WE HELP YOU TODAY? (4 Institutional Service Cards) */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#12304A] tracking-tight">
            How can we help you today?
          </h2>
          <p className="text-sm text-[#475569]">
            Select an official land records service to locate, digitize, or verify property titles.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Service 1: Search */}
          <Link
            href="/search"
            className="group bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-xs hover:border-[#0F766E] hover:shadow-sm transition-all flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-lg bg-[#DFF3EF] text-[#0F766E] flex items-center justify-center">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#12304A] group-hover:text-[#0F766E] transition-colors">
                1. Search Land Record
              </h3>
              <p className="text-xs text-[#475569] leading-relaxed">
                Find official Record of Rights (RTC/Pahani) by entering survey number, property ID, or owner name.
              </p>
            </div>
            <div className="pt-4 flex items-center gap-1 text-xs font-bold text-[#0F766E]">
              <span>Search Registry</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Service 2: Digitize */}
          <Link
            href="/digitize"
            className="group bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-xs hover:border-[#0F766E] hover:shadow-sm transition-all flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-lg bg-[#DFF3EF] text-[#0F766E] flex items-center justify-center">
                <UploadCloud className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#12304A] group-hover:text-[#0F766E] transition-colors">
                2. Digitize Old Document
              </h3>
              <p className="text-xs text-[#475569] leading-relaxed">
                Upload historical paper deeds or scanned Kannada land documents for automated Indic OCR parsing.
              </p>
            </div>
            <div className="pt-4 flex items-center gap-1 text-xs font-bold text-[#0F766E]">
              <span>Start Digitization</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Service 3: Track */}
          <Link
            href="/track"
            className="group bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-xs hover:border-[#0F766E] hover:shadow-sm transition-all flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-lg bg-[#DFF3EF] text-[#0F766E] flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#12304A] group-hover:text-[#0F766E] transition-colors">
                3. Track a Request
              </h3>
              <p className="text-xs text-[#475569] leading-relaxed">
                Check the real-time status of your digitized documents and official verification workflow.
              </p>
            </div>
            <div className="pt-4 flex items-center gap-1 text-xs font-bold text-[#0F766E]">
              <span>Track Application</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Service 4: Verify */}
          <Link
            href="/verify"
            className="group bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-xs hover:border-[#0F766E] hover:shadow-sm transition-all flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-lg bg-[#DFF3EF] text-[#0F766E] flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#12304A] group-hover:text-[#0F766E] transition-colors">
                4. Verify a Record
              </h3>
              <p className="text-xs text-[#475569] leading-relaxed">
                Validate document authenticity via SHA-256 cryptographic signatures and business rules.
              </p>
            </div>
            <div className="pt-4 flex items-center gap-1 text-xs font-bold text-[#0F766E]">
              <span>Verify Digital Seal</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </section>

      {/* 3. HOW IT WORKS (3 Simple Steps) */}
      <section className="bg-white rounded-xl border border-[#E2E8F0] p-8 sm:p-10 shadow-xs space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl font-bold text-[#12304A] tracking-tight">
            Simple steps to get your verified record
          </h2>
          <p className="text-xs sm:text-sm text-[#475569]">
            Our AI-powered spatial pipeline transforms scanned land records into legally admissible digital certificates.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Step 1 */}
          <div className="space-y-3 text-center sm:text-left">
            <div className="w-10 h-10 rounded-full bg-[#12304A] text-white flex items-center justify-center font-bold text-sm shadow-xs mx-auto sm:mx-0">
              1
            </div>
            <h3 className="text-base font-bold text-[#12304A]">Search or Upload</h3>
            <p className="text-xs text-[#475569] leading-relaxed">
              Enter your survey number or upload a scan/photo of your physical land deed or Record of Rights.
            </p>
          </div>

          {/* Step 2 */}
          <div className="space-y-3 text-center sm:text-left">
            <div className="w-10 h-10 rounded-full bg-[#0F766E] text-white flex items-center justify-center font-bold text-sm shadow-xs mx-auto sm:mx-0">
              2
            </div>
            <h3 className="text-base font-bold text-[#12304A]">Automatic Reading</h3>
            <p className="text-xs text-[#475569] leading-relaxed">
              The Indic OCR model extracts survey boundaries, owner names, land classifications, and bounding coordinates.
            </p>
          </div>

          {/* Step 3 */}
          <div className="space-y-3 text-center sm:text-left">
            <div className="w-10 h-10 rounded-full bg-[#059669] text-white flex items-center justify-center font-bold text-sm shadow-xs mx-auto sm:mx-0">
              3
            </div>
            <h3 className="text-base font-bold text-[#12304A]">Official Verified Copy</h3>
            <p className="text-xs text-[#475569] leading-relaxed">
              Review extracted fields against physical documents and download the certified digital title with cryptographic hash.
            </p>
          </div>
        </div>
      </section>

      {/* 4. RECENT DIGITIZED LAND RECORDS REGISTRY */}
      {featuredRecords.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-[#12304A] tracking-tight">
                Recently Digitized Land Records
              </h3>
              <p className="text-xs text-[#475569]">
                Live records active in the official digital title registry.
              </p>
            </div>
            <Link
              href="/search"
              className="text-xs font-bold text-[#0F766E] hover:underline flex items-center gap-1"
            >
              <span>View All Records</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredRecords.slice(0, 3).map((rec) => (
              <div
                key={rec.id}
                className="bg-white rounded-lg border border-[#E2E8F0] p-4 shadow-xs hover:border-[#0F766E]/60 transition-all flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-[#12304A]">
                      Sy. {rec.survey_number}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#D1FAE5] text-[#065F46]">
                      {rec.status}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-[#12304A] truncate">{rec.owner_name}</h4>
                  <p className="text-[11px] text-[#475569] truncate">
                    {rec.village}, {rec.taluk} &bull; {rec.total_area_text}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between text-xs">
                  <span className="text-[11px] text-[#475569]">
                    {new Date(rec.registration_date).toLocaleDateString()}
                  </span>
                  <Link
                    href={`/search/${rec.id}`}
                    className="text-xs font-bold text-[#0F766E] hover:underline flex items-center gap-1"
                  >
                    <span>View Record</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. CITIZEN SUPPORT SECTION */}
      <section className="bg-[#FAF9F5] border border-[#E2E8F0] rounded-xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <Building2 className="w-5 h-5 text-[#0F766E]" />
            <h3 className="text-lg font-bold text-[#12304A]">
              Need help with your property details?
            </h3>
          </div>
          <p className="text-xs text-[#475569] max-w-lg leading-relaxed">
            Contact your local Taluk Revenue Inspector or call the national digital land records toll-free helpdesk for assistance.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
          <a
            href="tel:18001802024"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded text-xs font-bold text-white bg-[#12304A] hover:bg-[#1A3F61] transition-colors"
          >
            <PhoneCall className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span>Toll-Free: 1800-180-2024</span>
          </a>
          <Link
            href="/help"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded text-xs font-bold text-[#12304A] bg-white border border-[#CBD5E1] hover:bg-slate-50 transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#0F766E]" />
            <span>Search FAQs & Help</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
