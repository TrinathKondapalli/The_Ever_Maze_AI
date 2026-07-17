import React from 'react';

export default function Footer() {
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
      <div className="text-[10px] text-slate-400 font-medium tracking-widest flex items-center gap-4">
        <div className="w-4 h-4 rotate-45 border border-slate-600"></div>
        © 2024 LUMINA. ALL RIGHTS RESERVED.
        <div className="w-4 h-4 rotate-45 border border-slate-600"></div>
      </div>
    </div>
  );
}
