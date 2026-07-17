import React from 'react';

export default function PrimaryButton({ onClick, disabled, loading }) {
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className="w-full relative overflow-hidden group bg-gradient-to-r from-[#0f4d30] via-[#1a7a4c] to-[#0f4d30] border-2 border-[#22c55e]/60 rounded-xl p-4 flex items-center justify-center transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(34,197,94,0.2)] hover:shadow-[0_0_30px_rgba(34,197,94,0.4)] disabled:opacity-70 disabled:pointer-events-none"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite]" />
      
      {/* Corner decorations */}
      <div className="absolute top-1.5 left-1.5 w-2 h-2 border-t border-l border-white/30" />
      <div className="absolute top-1.5 right-1.5 w-2 h-2 border-t border-r border-white/30" />
      <div className="absolute bottom-1.5 left-1.5 w-2 h-2 border-b border-l border-white/30" />
      <div className="absolute bottom-1.5 right-1.5 w-2 h-2 border-b border-r border-white/30" />

      <span className="text-xl md:text-2xl font-bold tracking-[0.2em] text-white drop-shadow-md z-10">
        {loading ? 'FINDING MATCH...' : 'PLAY'}
      </span>
    </button>
  );
}
