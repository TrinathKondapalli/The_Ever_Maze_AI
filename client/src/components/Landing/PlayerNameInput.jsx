import React from 'react';
import { User } from 'lucide-react';

export default function PlayerNameInput({ value, onChange }) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-center gap-3 mb-3 text-xs font-semibold tracking-[0.2em] text-[#d4af37]">
        <div className="w-1.5 h-1.5 rotate-45 border border-[#d4af37]/50" />
        PLAYER NAME
      </div>
      
      <div className="relative group">
        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none z-10">
          <User size={18} className="text-slate-400 group-focus-within:text-cyan-400 transition-colors duration-300" />
        </div>
        
        <input 
          type="text" 
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter your name..."
          maxLength={20}
          className="w-full bg-[#030910]/80 border border-cyan-900/40 rounded-xl pl-14 pr-4 py-4 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400/80 focus:ring-1 focus:ring-cyan-400/50 focus:bg-[#05111c] transition-all duration-300 shadow-inner"
        />
        
        {/* Subtle focus glow */}
        <div className="absolute inset-0 rounded-xl bg-cyan-400/5 opacity-0 group-focus-within:opacity-100 pointer-events-none transition-opacity duration-300 shadow-[0_0_15px_rgba(6,182,212,0.15)]" />
      </div>
    </div>
  );
}
