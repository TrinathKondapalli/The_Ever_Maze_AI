import React from 'react';

export default function GlassPanel({ children, className = '' }) {
  return (
    <div className={`relative w-full max-w-lg mx-auto ${className}`}>
      {/* Outer container with border and blur */}
      <div className="bg-[#061018]/70 backdrop-blur-xl border border-[#1a354b] p-6 sm:p-8 rounded-[2rem] shadow-[0_0_30px_rgba(6,182,212,0.1),inset_0_1px_1px_rgba(255,255,255,0.1)] relative overflow-hidden group">
        
        {/* Subtle hover shimmer */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-cyan-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />

        {/* Decorative corner accents (like in the image) */}
        <div className="absolute top-4 left-4 w-2 h-2 border-t border-l border-cyan-500/40 opacity-70"></div>
        <div className="absolute top-4 right-4 w-2 h-2 border-t border-r border-cyan-500/40 opacity-70"></div>
        <div className="absolute bottom-4 left-4 w-2 h-2 border-b border-l border-cyan-500/40 opacity-70"></div>
        <div className="absolute bottom-4 right-4 w-2 h-2 border-b border-r border-cyan-500/40 opacity-70"></div>

        <div className="relative z-10 flex flex-col gap-6">
          {children}
        </div>
      </div>
    </div>
  );
}
