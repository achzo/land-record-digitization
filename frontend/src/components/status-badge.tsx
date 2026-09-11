import React from "react";
import { DocumentStatus } from "@/lib/types";
import { ShieldCheck, Loader2, FileCheck2, AlertTriangle } from "lucide-react";

interface StatusBadgeProps {
  status: DocumentStatus;
  className?: string;
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className = "",
  showIcon = true,
}) => {
  switch (status) {
    case "COMPLETED":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0] ${className}`}
        >
          {showIcon && <ShieldCheck className="w-3.5 h-3.5 text-[#059669]" />}
          Digitally Verified
        </span>
      );
    case "PROCESSING":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] ${className}`}
        >
          {showIcon && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D97706]" />}
          Processing Record
        </span>
      );
    case "UPLOADED":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-[#DFF3EF] text-[#0F766E] border border-[#99F6E4] ${className}`}
        >
          {showIcon && <FileCheck2 className="w-3.5 h-3.5 text-[#0F766E]" />}
          Document Received
        </span>
      );
    case "FAILED":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA] ${className}`}
        >
          {showIcon && <AlertTriangle className="w-3.5 h-3.5 text-[#DC2626]" />}
          Verification Failed
        </span>
      );
    default:
      return (
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 ${className}`}
        >
          {status}
        </span>
      );
  }
};
