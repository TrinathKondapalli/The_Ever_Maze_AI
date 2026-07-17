import React from 'react';

export default function SecondaryButton({ onClick }) {
  return (
    <button 
      onClick={onClick}
      className="w-full relative overflow-hidden group bg-gradient-to-r from-[#2a1353] via-[#46218c] to-[#2a1353] border-2 border-[#a855f7]/50 rounded-xl p-3 flex items-center justify-center transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_15px_rgba(168,85,247,0.15)] hover:shadow-[0_0_25px_rgba(168,85,247,0.3)]"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite]" />
      
      {/* Corner decorations */}
      <div className="absolute top-1.5 left-1.5 w-1.5 h-1.5 border-t border-l border-white/20" />
      <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 border-t border-r border-white/20" />
      <div className="absolute bottom-1.5 left-1.5 w-1.5 h-1.5 border-b border-l border-white/20" />
      <div className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 border-b border-r border-white/20" />

      <span className="text-lg md:text-xl font-bold tracking-[0.15em] text-white drop-shadow-md z-10">
        CREATE ROOM
      </span>
    </button>
  );
}
