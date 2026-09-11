"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MOCK_FAQS } from "@/lib/mock-data";
import { FAQItem } from "@/lib/types";
import {
  HelpCircle,
  Search,
  PhoneCall,
  Mail,
  Building2,
  FileCheck,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  CheckCircle2,
  MapPin,
  FileText,
  Clock,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

export default function HelpSupportPage() {
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [openFaqId, setOpenFaqId] = useState<string | null>("faq-1");

  const categories = ["All", "General", "Digitization", "Search", "Verification", "Legal"];

  const filteredFaqs = MOCK_FAQS.filter((faq) => {
    const matchesCategory = activeCategory === "All" || faq.category === activeCategory;
    const matchesSearch =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleFaq = (id: string) => {
    setOpenFaqId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-16">
      {/* 1. Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded bg-[#DFF3EF] text-[#0F766E] text-xs font-bold uppercase tracking-wider">
          <HelpCircle className="w-3.5 h-3.5" />
          Citizen Guidance & Support Desk
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#12304A] tracking-tight">
          How can we assist you today?
        </h1>
        <p className="text-xs sm:text-sm text-[#475569] max-w-lg mx-auto">
          Find answers to common questions regarding land record digitization, survey searches, official verification, and statutory guidelines.
        </p>
      </div>

      {/* 2. Knowledge Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm max-w-2xl mx-auto">
        <div className="relative">
          <Search className="w-4 h-4 text-[#475569] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search FAQs (e.g. RTC, survey number, OCR error, fee)..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-[#CBD5E1] rounded text-xs text-[#12304A] placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
          />
        </div>
      </div>

      {/* 3. Three Key Service Guidance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs space-y-3">
          <div className="w-10 h-10 rounded bg-[#DFF3EF] text-[#0F766E] flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-[#12304A]">Required Documents</h3>
          <p className="text-xs text-[#475569] leading-relaxed">
            Ensure scanned deeds have legible sub-registrar stamps, clear survey numbers, and boundary descriptions.
          </p>
          <Link
            href="/digitize"
            className="text-xs font-bold text-[#0F766E] hover:underline flex items-center gap-1 pt-1"
          >
            <span>Digitize Deed</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs space-y-3">
          <div className="w-10 h-10 rounded bg-[#DFF3EF] text-[#0F766E] flex items-center justify-center">
            <Search className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-[#12304A]">Search Assistance</h3>
          <p className="text-xs text-[#475569] leading-relaxed">
            If survey number is unknown, locate by Khatedar owner name and Hobli village jurisdiction.
          </p>
          <Link
            href="/search"
            className="text-xs font-bold text-[#0F766E] hover:underline flex items-center gap-1 pt-1"
          >
            <span>Search Land</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs space-y-3">
          <div className="w-10 h-10 rounded bg-[#DFF3EF] text-[#0F766E] flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-[#12304A]">Legal Validity</h3>
          <p className="text-xs text-[#475569] leading-relaxed">
            All issued certificates contain immutable SHA-256 signatures compliant with Indian Evidence Act Sec-65B.
          </p>
          <Link
            href="/verify"
            className="text-xs font-bold text-[#0F766E] hover:underline flex items-center gap-1 pt-1"
          >
            <span>Verify Seal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* 4. Frequently Asked Questions (Accordion) */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-3">
          <h2 className="text-lg font-bold text-[#12304A] tracking-tight">
            Frequently Asked Questions
          </h2>

          {/* Category Pills */}
          <div className="flex flex-wrap gap-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors ${
                  activeCategory === cat
                    ? "bg-[#0F766E] text-white"
                    : "bg-white text-[#475569] border border-[#CBD5E1] hover:bg-slate-50"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {filteredFaqs.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-[#E2E8F0] text-center text-xs text-[#475569]">
            No FAQ answers found matching &ldquo;{searchQuery}&rdquo;. Try another term.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFaqs.map((faq) => {
              const isOpen = openFaqId === faq.id;
              return (
                <div
                  key={faq.id}
                  className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden transition-all"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(faq.id)}
                    className="w-full px-5 py-4 text-left flex items-center justify-between gap-3 hover:bg-[#FAF9F5] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#DFF3EF] text-[#0F766E]">
                        {faq.category}
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-[#12304A]">
                        {faq.question}
                      </span>
                    </div>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-[#0F766E] shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#475569] shrink-0" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs text-[#475569] leading-relaxed border-t border-[#E2E8F0] bg-[#FAF9F5]/40">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Citizen Support Helpdesk Info Box */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-3">
          <PhoneCall className="w-5 h-5 text-[#0F766E]" />
          <h3 className="text-base font-bold text-[#12304A]">
            Direct Citizen Support & Helpdesk
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Toll-Free Helpline</span>
            <p className="text-base font-extrabold text-[#12304A] font-mono">1800-180-2024</p>
            <p className="text-[11px] text-[#475569]">Mon - Sat: 8:00 AM - 8:00 PM IST</p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Support Email</span>
            <p className="text-sm font-bold text-[#0F766E]">support@bhumiai.gov.in</p>
            <p className="text-[11px] text-[#475569]">Response within 24 business hours</p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Local Revenue Office</span>
            <p className="text-xs font-semibold text-[#12304A]">Tahsildar & Sub-Registrar</p>
            <p className="text-[11px] text-[#475569]">Available at all Taluk headquarters</p>
          </div>
        </div>
      </div>
    </div>
  );
}
