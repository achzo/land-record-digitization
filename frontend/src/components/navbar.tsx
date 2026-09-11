"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Search,
  UploadCloud,
  Clock,
  ShieldCheck,
  Building2,
  HelpCircle,
  LayoutDashboard,
  CheckSquare,
  Cpu,
  Globe,
  User,
  ExternalLink,
  Menu,
  X,
  QrCode,
} from "lucide-react";

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [fontSize, setFontSize] = useState<"normal" | "large" | "xlarge">("normal");

  const navLinks = [
    { name: "Home", href: "/", icon: Building2 },
    { name: "Search Records", href: "/search", icon: Search },
    { name: "Digitize Document", href: "/digitize", icon: UploadCloud },
    { name: "Track Request", href: "/track", icon: Clock },
    { name: "Verify", href: "/verify", icon: ShieldCheck },
    { name: "Help", href: "/help", icon: HelpCircle },
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Review Queue", href: "/review", icon: CheckSquare },
    { name: "Model Registry", href: "/training", icon: Cpu },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
      {/* 1. Top Government Utility Strip */}
      <div className="bg-[#12304A] text-white text-[11px] py-1.5 px-4 sm:px-6 lg:px-8 border-b border-[#1E4264]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          {/* Left Gov Indicators */}
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-medium tracking-wide text-slate-200">
              <span className="w-2 h-2 rounded-full bg-[#059669]" />
              A Digital India Public Service Portal
            </span>
            <span className="text-slate-500 hidden sm:inline">&bull;</span>
            <span className="flex items-center gap-1 text-slate-300 font-normal hidden sm:inline-flex">
              <ShieldCheck className="w-3.5 h-3.5 text-[#34D399]" />
              NIC Certified Secure
            </span>
          </div>

          {/* Right Controls: Accessibility & Language */}
          <div className="flex items-center gap-4 text-slate-300 self-end sm:self-auto">
            {/* Accessibility Scaler */}
            <div className="flex items-center gap-1.5 bg-[#1A3F61] px-2 py-0.5 rounded border border-[#234F78]">
              <span className="text-[10px] text-slate-400 font-semibold uppercase mr-1">Text:</span>
              <button
                type="button"
                onClick={() => setFontSize("normal")}
                className={`px-1 text-[11px] font-bold rounded ${fontSize === "normal" ? "text-white bg-[#0F766E]" : "hover:text-white"}`}
                title="Normal Font Size"
              >
                A-
              </button>
              <button
                type="button"
                onClick={() => setFontSize("large")}
                className={`px-1 text-[12px] font-bold rounded ${fontSize === "large" ? "text-white bg-[#0F766E]" : "hover:text-white"}`}
                title="Default Font Size"
              >
                A
              </button>
              <button
                type="button"
                onClick={() => setFontSize("xlarge")}
                className={`px-1 text-[13px] font-bold rounded ${fontSize === "xlarge" ? "text-white bg-[#0F766E]" : "hover:text-white"}`}
                title="Larger Font Size"
              >
                A+
              </button>
            </div>

            {/* Language Selector */}
            <div className="flex items-center gap-1 font-medium hover:text-white cursor-pointer">
              <Globe className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span>English</span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-400 hover:text-white">ಕನ್ನಡ</span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-400 hover:text-white">हिन्दी</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Institutional Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          {/* Left Emblem & App Title */}
          <Link href="/" className="flex items-center gap-3.5 group">
            <div className="w-12 h-12 rounded-lg bg-[#12304A] border border-[#0F766E]/40 flex items-center justify-center text-white shadow-sm shrink-0">
              <div className="w-9 h-9 rounded border border-[#38BDF8]/40 flex flex-col items-center justify-center">
                <span className="text-[13px] font-extrabold tracking-tight text-[#FBBF24]">ಭೂ</span>
                <span className="text-[9px] font-semibold tracking-tighter text-[#38BDF8] -mt-1">AI</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-extrabold text-[#12304A] tracking-tight group-hover:text-[#0F766E] transition-colors">
                  BhumiAI
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#DFF3EF] text-[#0F766E] border border-[#99F6E4]">
                  Govt. of India
                </span>
              </div>
              <p className="text-xs font-medium text-[#475569] tracking-wide">
                Digital Land Records &bull; National Portal
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden xl:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded text-xs font-semibold tracking-tight transition-colors ${
                    isActive
                      ? "bg-[#0F766E] text-white shadow-xs"
                      : "text-[#12304A] hover:text-[#0F766E] hover:bg-[#FAF9F5]"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Right Action: Officer Profile */}
          <div className="hidden sm:flex items-center gap-3">
            <div className="flex items-center gap-2 pl-2 border-l border-[#E2E8F0]">
              <div className="w-8 h-8 rounded-full bg-[#12304A] text-white flex items-center justify-center text-xs font-bold shadow-xs">
                <User className="w-4 h-4" />
              </div>
              <div className="text-left hidden md:block">
                <p className="text-xs font-bold text-[#12304A] leading-tight">Revenue Officer</p>
                <p className="text-[10px] text-[#475569]">Bidadi Taluk &bull; ID #KA-4091</p>
              </div>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex xl:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-[#12304A] hover:bg-[#FAF9F5] rounded-md border border-[#CBD5E1]"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Nav */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-t border-[#E2E8F0] bg-white px-4 pt-2 pb-4 space-y-1 shadow-md">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded text-xs font-semibold ${
                  isActive
                    ? "bg-[#0F766E] text-white"
                    : "text-[#12304A] hover:bg-[#FAF9F5]"
                }`}
              >
                <Icon className="w-4 h-4" />
                {link.name}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
};
