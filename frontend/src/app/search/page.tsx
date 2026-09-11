"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { searchLandRecords } from "@/lib/api";
import { LandRecord } from "@/lib/types";
import {
  Search,
  FileText,
  ShieldCheck,
  Download,
  ChevronRight,
  MapPin,
  User,
  Loader2,
  Building2,
  CheckCircle2,
  AlertCircle,
  Tag,
  Layers,
} from "lucide-react";

export default function SearchRecordsPage() {
  const [activeTab, setActiveTab] = useState<"survey" | "property" | "owner">("survey");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedState, setSelectedState] = useState("Karnataka");
  const [selectedDistrict, setSelectedDistrict] = useState("Ramanagara");
  const [selectedTaluk, setSelectedTaluk] = useState("Bidadi");
  const [village, setVillage] = useState("");

  const [results, setResults] = useState<LandRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Initial load: show all default records in district
  useEffect(() => {
    async function loadDefaultRecords() {
      try {
        setLoading(true);
        const data = await searchLandRecords({
          search_type: "survey",
          query: "",
          state: selectedState,
          district: selectedDistrict,
          taluk: selectedTaluk,
        });
        setResults(data);
      } catch (err) {
        console.error("Failed to load records:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDefaultRecords();
  }, [selectedState, selectedDistrict, selectedTaluk]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setHasSearched(true);

    try {
      // Calls centralized searchLandRecords API abstraction
      const data = await searchLandRecords({
        search_type: activeTab,
        query: searchTerm,
        state: selectedState,
        district: selectedDistrict,
        taluk: selectedTaluk,
        village: village || undefined,
      });
      setResults(data);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const getTabPlaceholder = () => {
    switch (activeTab) {
      case "survey":
        return "Enter Survey Number or Hissa (e.g. 142/3A, 88/1, 204/2)...";
      case "property":
        return "Enter Property ID or RoR Number (e.g. PID-KA-RAM-8901, ROR-KA-2026-98124)...";
      case "owner":
        return "Enter Land Owner Name (e.g. Shivashankaraiah, Parvathamma, Chennegowda)...";
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* 1. Page Header */}
      <div className="border-b border-[#E2E8F0] pb-5 space-y-1.5">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#DFF3EF] text-[#0F766E] text-[11px] font-bold uppercase tracking-wider">
          <ShieldCheck className="w-3.5 h-3.5" />
          Official Cadastral Land Registry
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#12304A] tracking-tight">
          Search Land Records
        </h1>
        <p className="text-sm text-[#475569]">
          Enter any information you know about the property to find official Record of Rights (RTC/Pahani) and digitized titles.
        </p>
      </div>

      {/* 2. Institutional Search Form with Tabs */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        {/* Search Mode Tabs */}
        <div className="flex border-b border-[#E2E8F0] bg-[#FAF9F5] text-xs font-bold text-[#475569]">
          <button
            type="button"
            onClick={() => {
              setActiveTab("survey");
              setSearchTerm("");
            }}
            className={`flex-1 py-3 px-4 text-center transition-colors border-b-2 ${
              activeTab === "survey"
                ? "border-[#0F766E] text-[#0F766E] bg-white font-extrabold"
                : "border-transparent hover:text-[#12304A]"
            }`}
          >
            Search by Survey Number
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("property");
              setSearchTerm("");
            }}
            className={`flex-1 py-3 px-4 text-center transition-colors border-b-2 ${
              activeTab === "property"
                ? "border-[#0F766E] text-[#0F766E] bg-white font-extrabold"
                : "border-transparent hover:text-[#12304A]"
            }`}
          >
            Search by Property ID
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("owner");
              setSearchTerm("");
            }}
            className={`flex-1 py-3 px-4 text-center transition-colors border-b-2 ${
              activeTab === "owner"
                ? "border-[#0F766E] text-[#0F766E] bg-white font-extrabold"
                : "border-transparent hover:text-[#12304A]"
            }`}
          >
            Search by Owner Name
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSearch} className="p-6 space-y-5">
          {/* Dropdown Filters (State, District, Taluk, Village) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-[#12304A] uppercase tracking-wider text-[10px]">
                State
              </label>
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded text-xs font-medium text-[#12304A] focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
              >
                <option value="Karnataka">Karnataka</option>
                <option value="Maharashtra">Maharashtra</option>
                <option value="Tamil Nadu">Tamil Nadu</option>
                <option value="Andhra Pradesh">Andhra Pradesh</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-[#12304A] uppercase tracking-wider text-[10px]">
                District
              </label>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded text-xs font-medium text-[#12304A] focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
              >
                <option value="Ramanagara">Ramanagara</option>
                <option value="Bengaluru Urban">Bengaluru Urban</option>
                <option value="Mysuru">Mysuru</option>
                <option value="Mandya">Mandya</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-[#12304A] uppercase tracking-wider text-[10px]">
                Taluk / Hobli
              </label>
              <select
                value={selectedTaluk}
                onChange={(e) => setSelectedTaluk(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded text-xs font-medium text-[#12304A] focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
              >
                <option value="Bidadi">Bidadi Hobli</option>
                <option value="Ramanagara">Ramanagara Kasaba</option>
                <option value="Bengaluru South">Bengaluru South</option>
                <option value="T. Narasipura">T. Narasipura</option>
                <option value="Maddur">Maddur</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-[#12304A] uppercase tracking-wider text-[10px]">
                Village (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Kenchanakuppe"
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded text-xs font-medium text-[#12304A] focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
              />
            </div>
          </div>

          {/* Search Query Input */}
          <div className="space-y-1.5">
            <label className="font-bold text-[#12304A] uppercase tracking-wider text-[10px]">
              {activeTab === "survey"
                ? "Survey Number / Hissa"
                : activeTab === "property"
                ? "Property Identification Number (PID / RoR)"
                : "Primary Land Owner Name"}
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#475569] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={getTabPlaceholder()}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#CBD5E1] rounded text-sm text-[#12304A] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded text-sm font-bold text-white bg-[#0F766E] hover:bg-[#0D655E] shadow-xs flex items-center justify-center gap-2 shrink-0 transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span>Search Record</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 3. Search Results Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-[#12304A]">
            {hasSearched ? (
              <span>
                Search Results ({results.length} records found for &ldquo;{searchTerm || "All"}&rdquo;)
              </span>
            ) : (
              <span>Registered Land Records in {selectedTaluk} ({results.length})</span>
            )}
          </h3>
          <span className="text-xs text-[#475569]">
            Jurisdiction: {selectedDistrict}, {selectedState}
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center bg-white rounded-xl border border-[#E2E8F0]">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#0F766E] mb-2" />
            <p className="text-xs font-semibold text-[#475569]">
              Querying official cadastral registry...
            </p>
          </div>
        ) : results.length === 0 ? (
          /* Empty Search State */
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-10 text-center space-y-3">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-base font-bold text-[#12304A]">No Matching Land Records Found</h4>
            <p className="text-xs text-[#475569] max-w-md mx-auto leading-relaxed">
              We couldn&apos;t find any records matching &ldquo;{searchTerm}&rdquo; in {selectedTaluk}, {selectedDistrict}. You can upload a new physical deed or search in a different district.
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                onClick={() => {
                  setSearchTerm("");
                  setHasSearched(false);
                }}
                className="px-4 py-2 rounded text-xs font-semibold text-[#12304A] bg-[#FAF9F5] border border-[#E2E8F0] hover:bg-slate-100"
              >
                Reset Search
              </button>
              <Link
                href="/digitize"
                className="px-4 py-2 rounded text-xs font-semibold text-white bg-[#0F766E] hover:bg-[#0D655E]"
              >
                Digitize Physical Deed
              </Link>
            </div>
          </div>
        ) : (
          /* Result Cards Grid */
          <div className="space-y-4">
            {results.map((rec) => (
              <div
                key={rec.id}
                className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-xs hover:border-[#0F766E]/60 transition-all space-y-3.5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E8F0] pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-[#12304A] text-white flex items-center justify-center font-bold text-xs">
                      #{rec.id}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-[#12304A]">
                          Survey No. {rec.survey_number} {rec.hissa_number && `(${rec.hissa_number})`}
                        </h4>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0]">
                          Verified Official Record
                        </span>
                      </div>
                      <p className="text-[11px] text-[#475569] font-mono mt-0.5">
                        RoR: {rec.ror_number} &bull; PID: {rec.property_id || "N/A"}
                      </p>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded text-xs font-bold bg-[#DFF3EF] text-[#0F766E]">
                    {rec.document_type}
                  </span>
                </div>

                {/* Property Metadata Columns */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="flex items-center gap-2 text-[#475569]">
                    <User className="w-4 h-4 text-[#0F766E] shrink-0" />
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400">Primary Land Owner</span>
                      <p className="text-[#12304A] font-bold">{rec.owner_name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[#475569]">
                    <MapPin className="w-4 h-4 text-[#0F766E] shrink-0" />
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400">Location / Village</span>
                      <p className="text-[#12304A] font-medium">{rec.village}, {rec.taluk}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[#475569]">
                    <Layers className="w-4 h-4 text-[#0F766E] shrink-0" />
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400">Land Extent & Type</span>
                      <p className="text-[#12304A] font-bold">{rec.total_area_text}</p>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[#E2E8F0]">
                  <span className="text-[11px] text-[#475569]">
                    Issuing Authority: <strong>{rec.issuing_authority}</strong>
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => alert(`Downloading verified PDF for Survey No. ${rec.survey_number}`)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold text-[#12304A] bg-[#FAF9F5] border border-[#CBD5E1] hover:bg-slate-100 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-[#0F766E]" />
                      Download PDF
                    </button>

                    <Link
                      href={`/search/${rec.id}`}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-bold text-white bg-[#0F766E] hover:bg-[#0D655E] transition-colors shadow-2xs"
                    >
                      <span>View Record Details</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
