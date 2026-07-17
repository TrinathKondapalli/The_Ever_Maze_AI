import React from 'react';
import { Globe, ChevronDown } from 'lucide-react';

export default function LanguageSelector() {
  return (
    <button className="absolute bottom-6 left-6 flex items-center gap-2 bg-[#0a1520]/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-[#1a354b] shadow-[0_4px_20px_rgba(0,0,0,0.5)] hover:bg-[#122336]/90 transition-colors z-20 group">
      <Globe size={16} className="text-cyan-500 group-hover:text-cyan-400" />
      <span className="text-white text-xs font-bold tracking-widest px-1">ENGLISH</span>
      <ChevronDown size={14} className="text-slate-400 group-hover:text-white transition-colors" />
    </button>
  );
}
