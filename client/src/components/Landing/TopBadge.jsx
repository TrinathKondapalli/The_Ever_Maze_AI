import React from 'react';
import { Users } from 'lucide-react';

export default function TopBadge() {
  return (
    <div className="absolute top-6 left-6 flex items-center gap-3 bg-[#0a1520]/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-[#1a354b] shadow-[0_4px_20px_rgba(0,0,0,0.5)] z-20 hover:bg-[#0c1a28]/90 transition-colors">
      <div className="text-cyan-400">
        <Users size={24} strokeWidth={2.5} />
      </div>
      <div className="flex flex-col">
        <span className="text-white text-xs font-bold tracking-widest leading-none mb-1">
          2 - 14 PLAYERS
        </span>
        <span className="text-cyan-600 text-[9px] font-bold tracking-[0.2em] leading-none">
          TEAM UP & PLAY
        </span>
      </div>
    </div>
  );
}
