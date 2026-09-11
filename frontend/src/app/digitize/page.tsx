"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Lock,
  Loader2,
  X,
  FileCheck2,
  Building2,
  Check,
} from "lucide-react";

export default function DigitizePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [currentStep, setCurrentStep] = useState<1 | 2>(1); // 1: Upload, 2: Reading
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const allowedTypes = [".pdf", ".png", ".jpg", ".jpeg", ".webp", ".tiff"];

  const handleFileSelect = (file: File) => {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!allowedTypes.includes(ext)) {
      setErrorMessage(`Invalid format '${ext}'. Please upload a valid land document (PDF, PNG, JPG, WEBP, TIFF).`);
      return;
    }
    setSelectedFile(file);
    setErrorMessage(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleStartDigitization = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    // Simulate Step 2: Reading (OCR & Layout parsing)
    setCurrentStep(2);

    // After 2.5 seconds simulated reading, navigate to Review Extracted Information
    setTimeout(() => {
      router.push("/digitize/review");
    }, 2500);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      {/* 1. Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded bg-[#DFF3EF] text-[#0F766E] text-xs font-bold uppercase tracking-wider">
          <Building2 className="w-3.5 h-3.5" />
          Citizen Land Digitization Portal
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#12304A] tracking-tight">
          Digitize Old Land Document
        </h1>
        <p className="text-xs sm:text-sm text-[#475569] max-w-lg mx-auto">
          Upload physical deed copies, Record of Rights (RTC/Pahani), or Akarband extracts for spatial Indic AI extraction and digital certification.
        </p>
      </div>

      {/* 2. Top Progress Stepper */}
      <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs">
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          {/* Step 1 */}
          <div className={`space-y-1.5 border-b-2 pb-2 ${currentStep === 1 ? "border-[#0F766E] text-[#0F766E]" : "border-[#059669] text-[#059669]"}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold mx-auto ${
              currentStep === 1 ? "bg-[#0F766E] text-white" : "bg-[#D1FAE5] text-[#059669]"
            }`}>
              {currentStep === 1 ? "1" : "✓"}
            </div>
            <span className="font-bold block text-[11px]">1. Upload</span>
          </div>

          {/* Step 2 */}
          <div className={`space-y-1.5 border-b-2 pb-2 ${currentStep === 2 ? "border-[#D97706] text-[#D97706]" : "border-slate-200 text-[#475569]"}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold mx-auto ${
              currentStep === 2 ? "bg-[#FEF3C7] text-[#D97706]" : "bg-slate-100 text-[#475569]"
            }`}>
              2
            </div>
            <span className="font-bold block text-[11px]">2. Reading (OCR)</span>
          </div>

          {/* Step 3 */}
          <div className="space-y-1.5 border-b-2 border-slate-200 pb-2 text-[#475569]">
            <div className="w-6 h-6 rounded-full bg-slate-100 text-[#475569] flex items-center justify-center text-[11px] font-bold mx-auto">
              3
            </div>
            <span className="font-medium block text-[11px]">3. Review Details</span>
          </div>

          {/* Step 4 */}
          <div className="space-y-1.5 border-b-2 border-slate-200 pb-2 text-[#475569]">
            <div className="w-6 h-6 rounded-full bg-slate-100 text-[#475569] flex items-center justify-center text-[11px] font-bold mx-auto">
              4
            </div>
            <span className="font-medium block text-[11px]">4. Verify & Issue</span>
          </div>
        </div>
      </div>

      {/* 3. Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Upload Error</p>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4. Reading Simulation State (Step 2) */}
      {currentStep === 2 ? (
        <div className="bg-white p-10 rounded-xl border border-[#E2E8F0] shadow-sm text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-[#FEF3C7] text-[#D97706] flex items-center justify-center mx-auto shadow-xs">
            <Loader2 className="w-7 h-7 animate-spin" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-[#12304A]">
              Indic OCR Model Reading Land Document...
            </h3>
            <p className="text-xs text-[#475569] max-w-md mx-auto leading-relaxed">
              Extracting Kannada handwriting, survey number bounds, Khatedar details, and total cadastral extent in Acres and Guntas.
            </p>
          </div>

          <div className="w-56 h-2 bg-slate-100 rounded-full overflow-hidden mx-auto">
            <div className="w-full h-full bg-[#0F766E] animate-[pulse_1s_infinite]" />
          </div>

          <p className="text-[11px] text-slate-400 font-mono pt-2">
            Simulating spatial entity recognition &bull; Redirecting to Review screen...
          </p>
        </div>
      ) : (
        /* Step 1: Upload Form */
        <form
          onSubmit={handleStartDigitization}
          className="bg-white p-6 sm:p-8 rounded-xl border border-[#E2E8F0] shadow-sm space-y-6"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.tiff"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileSelect(e.target.files[0]);
              }
            }}
          />

          {/* Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
              isDragging
                ? "border-[#0F766E] bg-[#DFF3EF]/40"
                : selectedFile
                ? "border-[#059669] bg-[#D1FAE5]/20"
                : "border-[#CBD5E1] hover:border-[#0F766E] hover:bg-[#FAF9F5]"
            }`}
          >
            <div className="w-14 h-14 mx-auto rounded-full bg-[#DFF3EF] text-[#0F766E] flex items-center justify-center mb-3.5 shadow-xs">
              <UploadCloud className="w-7 h-7" />
            </div>

            <h3 className="text-base font-bold text-[#12304A]">
              {selectedFile ? "Click or drop to replace document" : "Click to select a file, or drag and drop"}
            </h3>
            <p className="text-xs text-[#475569] mt-1.5 max-w-sm mx-auto">
              Supported formats: PDF, PNG, JPG, JPEG, WEBP, TIFF &bull; Up to 50MB
            </p>

            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded bg-[#FAF9F5] border border-[#E2E8F0] text-[11px] font-semibold text-[#475569]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#059669]" />
              <span>Encrypted with SHA-256 National Registry Deduplication</span>
            </div>
          </div>

          {/* Selected File Card */}
          {selectedFile && (
            <div className="flex items-center justify-between p-4 bg-[#FAF9F5] border border-[#E2E8F0] rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-[#DFF3EF] text-[#0F766E] flex items-center justify-center">
                  <FileCheck2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#12304A] truncate max-w-xs">{selectedFile.name}</p>
                  <p className="text-[11px] text-[#475569]">{formatFileSize(selectedFile.size)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFile(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Submit CTA */}
          <button
            type="submit"
            disabled={!selectedFile}
            className="w-full py-3.5 px-4 rounded text-sm font-bold text-white bg-[#0F766E] hover:bg-[#0D655E] shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload & Begin Digitization</span>
          </button>

          {/* Trust Indicators */}
          <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] text-[#475569] border-t border-[#E2E8F0]">
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-[#059669]" />
              <span>Kannada & English Indic OCR extraction</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#059669]" />
              <span>NIC Cloud verified storage and encryption</span>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
