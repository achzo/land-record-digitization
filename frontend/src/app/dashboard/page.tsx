"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { DocumentItem, DocumentSearchItem } from "@/lib/types";
import { fetchDocuments, searchDocuments, deleteDocumentRecord, getDirectDownloadUrl } from "@/lib/api";
import { StatusBadge } from "@/components/status-badge";
import {
  Building2,
  UploadCloud,
  RefreshCw,
  Search,
  Download,
  Trash2,
  CheckCircle2,
  Clock,
  Loader2,
  AlertTriangle,
  Tag,
  X,
  ShieldCheck,
  FileText,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

export default function RecordsDashboardPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [searchResults, setSearchResults] = useState<DocumentSearchItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadDocuments = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchDocuments();
      setDocuments(data);
    } catch (err: any) {
      setError(err.message || "Failed to load land records from backend.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();

    // Auto-poll every 3 seconds if any document is in non-terminal state
    const interval = setInterval(() => {
      const hasActiveJobs = documents.some(
        (doc) => doc.status === "UPLOADED" || doc.status === "PROCESSING"
      );
      if (hasActiveJobs && !searchTerm.trim()) {
        loadDocuments();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [loadDocuments, documents, searchTerm]);

  // Debounced backend search for filename and extracted fields
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults(null);
      setSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const filter = statusFilter !== "ALL" ? statusFilter : undefined;
        const res = await searchDocuments(searchTerm.trim(), undefined, filter);
        setSearchResults(res.results);
      } catch (err: any) {
        console.error("Search error:", err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, statusFilter]);

  const handleDelete = async (id: number, filename: string) => {
    if (!confirm(`Are you sure you want to delete land record "${filename}"?`)) return;
    try {
      setDeletingId(id);
      await deleteDocumentRecord(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      if (searchResults) {
        setSearchResults((prev) => prev?.filter((d) => d.id !== id) || null);
      }
    } catch (err: any) {
      alert(`Error deleting record: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const totalCount = documents.length;
  const completedCount = documents.filter((d) => d.status === "COMPLETED").length;
  const processingCount = documents.filter(
    (d) => d.status === "PROCESSING" || d.status === "UPLOADED"
  ).length;
  const failedCount = documents.filter((d) => d.status === "FAILED").length;

  const displayList = searchResults
    ? searchResults
    : statusFilter === "ALL"
    ? documents
    : documents.filter((d) => d.status === statusFilter);

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#DFF3EF] text-[#0F766E] text-[11px] font-bold uppercase tracking-wider">
            <Building2 className="w-3.5 h-3.5" />
            Official Land Records Repository
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#12304A] tracking-tight mt-1">
            Records Management Dashboard
          </h1>
          <p className="text-sm text-[#475569] mt-0.5">
            Institutional overview of all digitized deeds, Record of Rights (RoR), and verification jobs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadDocuments}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-[#12304A] bg-white border border-[#CBD5E1] rounded hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <Link
            href="/upload"
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#0F766E] hover:bg-[#0D655E] rounded shadow-xs transition-colors"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Digitize Record</span>
          </Link>
        </div>
      </div>

      {/* 2. Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">Total Records</p>
            <p className="text-2xl font-extrabold text-[#12304A] mt-1">{totalCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#FAF9F5] border border-[#E2E8F0] flex items-center justify-center text-[#12304A]">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-[#059669] uppercase tracking-wider">Digitally Verified</p>
            <p className="text-2xl font-extrabold text-[#12304A] mt-1">{completedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#D1FAE5] flex items-center justify-center text-[#059669]">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-[#D97706] uppercase tracking-wider">Processing OCR</p>
            <p className="text-2xl font-extrabold text-[#12304A] mt-1">{processingCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#FEF3C7] flex items-center justify-center text-[#D97706]">
            <Loader2 className={`w-5 h-5 ${processingCount > 0 ? "animate-spin" : ""}`} />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-[#DC2626] uppercase tracking-wider">Action Required</p>
            <p className="text-2xl font-extrabold text-[#12304A] mt-1">{failedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#FEE2E2] flex items-center justify-center text-[#DC2626]">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Error Alert */}
      {error && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span className="font-semibold">{error}</span>
          </div>
          <button onClick={loadDocuments} className="font-bold underline hover:no-underline">
            Retry
          </button>
        </div>
      )}

      {/* 4. Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#475569] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search records by filename or extracted text (e.g. Shivashankaraiah, 142/3A, Bidadi)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-white border border-[#CBD5E1] rounded text-xs text-[#12304A] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F766E] shadow-2xs"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-1 bg-white p-1 rounded border border-[#CBD5E1] shadow-2xs text-xs font-bold">
          {["ALL", "COMPLETED", "PROCESSING", "FAILED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded transition-all ${
                statusFilter === st
                  ? "bg-[#0F766E] text-white"
                  : "text-[#475569] hover:bg-slate-100"
              }`}
            >
              {st === "COMPLETED" ? "VERIFIED" : st}
            </button>
          ))}
        </div>
      </div>

      {/* Search Result Count */}
      {searchTerm && (
        <div className="text-xs text-[#475569] flex items-center justify-between">
          <p>
            {searching ? (
              <span className="flex items-center gap-1.5 text-[#0F766E] font-semibold">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Querying PostgreSQL database...
              </span>
            ) : (
              <span>
                Found <strong className="text-[#12304A]">{displayList.length}</strong> matching land records for &ldquo;{searchTerm}&rdquo;
              </span>
            )}
          </p>
        </div>
      )}

      {/* 5. Land Records Table */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        {loading && documents.length === 0 ? (
          <div className="py-20 text-center text-[#475569]">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#0F766E] mb-2" />
            <p className="text-xs font-semibold">Loading land records from PostgreSQL database...</p>
          </div>
        ) : displayList.length === 0 ? (
          <div className="py-20 text-center text-[#475569] space-y-2">
            <FileText className="w-12 h-12 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-bold text-[#12304A]">No Land Records Found</p>
            <p className="text-xs max-w-sm mx-auto">
              {searchTerm
                ? `No records matched "${searchTerm}". Try a different survey number, owner name, or district.`
                : "Upload and digitize your first physical land deed or Record of Rights."}
            </p>
            <div className="pt-2">
              <Link
                href="/upload"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded text-xs font-bold text-white bg-[#0F766E] hover:bg-[#0D655E]"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Upload New Deed</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-[#FAF9F5] text-[#12304A] font-bold border-b border-[#E2E8F0] uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Record ID</th>
                  <th className="py-3.5 px-4">Land Document & Matches</th>
                  <th className="py-3.5 px-4">SHA-256 Signature</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Ingestion Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayList.map((doc) => {
                  const searchItem = "matched_fields" in doc ? (doc as DocumentSearchItem) : null;
                  return (
                    <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-[#12304A]">#{doc.id}</td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <Link
                            href={`/documents/${doc.id}`}
                            className="font-bold text-[#0F766E] hover:underline flex items-center gap-1.5 text-xs"
                          >
                            <FileText className="w-4 h-4 text-slate-400" />
                            {doc.filename}
                          </Link>

                          {/* Matched Fields Provenance Badges */}
                          {searchItem && searchItem.matched_fields && searchItem.matched_fields.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                              {searchItem.matched_fields.slice(0, 3).map((f) => (
                                <span
                                  key={f.id}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[#DFF3EF] text-[#0F766E] border border-[#99F6E4]"
                                >
                                  <Tag className="w-2.5 h-2.5" />
                                  <span>{f.field_name}:</span> {f.normalized_value || f.original_value}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#475569]">
                        {doc.file_hash.substring(0, 16)}...
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={doc.status} />
                      </td>
                      <td className="py-3.5 px-4 text-[#475569]">
                        {new Date(doc.created_at).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/documents/${doc.id}`}
                            className="p-1.5 text-[#475569] hover:text-[#0F766E] hover:bg-[#DFF3EF]/40 rounded transition-colors"
                            title="Review Details & Extracted Fields"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                          <a
                            href={getDirectDownloadUrl(doc.id)}
                            className="p-1.5 text-[#475569] hover:text-[#0F766E] hover:bg-[#DFF3EF]/40 rounded transition-colors"
                            title="Download Document"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => handleDelete(doc.id, doc.filename)}
                            disabled={deletingId === doc.id}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors disabled:opacity-50"
                            title="Delete Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
