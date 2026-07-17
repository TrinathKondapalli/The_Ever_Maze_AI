import React from 'react';
import { Settings, BookOpen } from 'lucide-react';

export default function SettingsButtons() {
  return (
    <div className="absolute top-6 right-6 flex flex-col gap-3 z-20">
      <button className="flex flex-col items-center justify-center gap-1.5 w-[72px] h-[72px] bg-[#0a1520]/80 backdrop-blur-md rounded-2xl border border-[#1a354b] shadow-[0_4px_20px_rgba(0,0,0,0.5)] hover:bg-[#122336]/90 hover:border-cyan-500/50 hover:text-cyan-400 transition-all text-cyan-500 group">
        <Settings size={22} className="group-hover:rotate-90 transition-transform duration-500" />
        <span className="text-[9px] font-bold tracking-widest text-slate-300 group-hover:text-cyan-100">SETTINGS</span>
      </button>

      <button className="flex flex-col items-center justify-center gap-1.5 w-[72px] h-[72px] bg-[#0a1520]/80 backdrop-blur-md rounded-2xl border border-[#1a354b] shadow-[0_4px_20px_rgba(0,0,0,0.5)] hover:bg-[#122336]/90 hover:border-cyan-500/50 hover:text-cyan-400 transition-all text-cyan-500 group">
        <BookOpen size={22} className="group-hover:-translate-y-0.5 transition-transform" />
        <span className="text-[9px] font-bold tracking-widest text-slate-300 group-hover:text-cyan-100">HOW TO PLAY</span>
      </button>
    </div>
  );
}
