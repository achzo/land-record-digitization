import React from "react";
import Link from "next/link";
import { PhoneCall, ShieldCheck, Mail, Lock, ExternalLink, Building } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#12304A] text-slate-300 border-t border-[#1E4264] mt-16">
      {/* Upper Info Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1: Portal Overview */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-[#0F766E] flex items-center justify-center text-white font-extrabold text-sm">
                ಭೂ
              </div>
              <span className="text-xl font-bold text-white tracking-tight">BhumiAI</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              National Digital Land Records Platform. Empowering citizens with instant search, spatial OCR digitization, and tamper-proof Record of Rights (RoR) verification.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1">
              <ShieldCheck className="w-4 h-4 text-[#34D399]" />
              <span>Digital Locker Integrated Partner</span>
            </div>
          </div>

          {/* Col 2: Citizen Services */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Citizen Services</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/search" className="hover:text-white transition-colors">
                  Search Land Records (RTC / Pahani)
                </Link>
              </li>
              <li>
                <Link href="/digitize" className="hover:text-white transition-colors">
                  Digitize Physical Deed
                </Link>
              </li>
              <li>
                <Link href="/track" className="hover:text-white transition-colors">
                  Track Application Status
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-white transition-colors">
                  Official Records Registry
                </Link>
              </li>
              <li>
                <Link href="/review" className="hover:text-white transition-colors">
                  Human-in-the-Loop Review Queue
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Legal & Institutional */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Policies & Guidelines</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <span className="hover:text-white transition-colors cursor-pointer">
                  NIC Security Compliance
                </span>
              </li>
              <li>
                <span className="hover:text-white transition-colors cursor-pointer">
                  Data Protection & Privacy Policy
                </span>
              </li>
              <li>
                <span className="hover:text-white transition-colors cursor-pointer">
                  Terms of Service & Citizen Charter
                </span>
              </li>
              <li>
                <span className="hover:text-white transition-colors cursor-pointer">
                  Land Revenue Act Guidelines
                </span>
              </li>
              <li>
                <a
                  href="http://localhost:8000/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors flex items-center gap-1"
                >
                  Developer API Specifications <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4: Citizen Helpline */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Citizen Support</h4>
            <div className="p-3.5 bg-[#1A3F61] rounded-lg border border-[#234F78] space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <PhoneCall className="w-4 h-4 text-[#38BDF8]" />
                <span>Toll-free Citizen Support</span>
              </div>
              <p className="text-lg font-bold text-[#FBBF24] tracking-wide font-mono">1800-180-2024</p>
              <p className="text-[11px] text-slate-300">Mon - Sat: 8:00 AM - 8:00 PM IST</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-300 pt-1">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>support@bhumiai.gov.in</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Legal Strip */}
      <div className="border-t border-[#1E4264] py-4 bg-[#0D2438] text-[11px] text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-center sm:text-left">
            &copy; 2025 BhumiAI &bull; Department of Land Resources, Ministry of Rural Development. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Designed for Digital India</span>
            <span>&bull;</span>
            <span>Hosted on National Cloud Infrastructure</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
