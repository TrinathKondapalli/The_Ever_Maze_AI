import React from 'react';
import { PLAYER_COLORS } from '../../constants/index.js';

export default function ColorPicker({ selectedIndex, onSelect }) {
  return (
    <div className="w-full mt-2">
      <div className="flex items-center justify-center gap-3 mb-4 text-[10px] font-semibold tracking-[0.2em] text-cyan-500/70">
        <div className="w-1 h-1 rotate-45 border border-cyan-500/50" />
        <div className="h-px w-6 bg-gradient-to-r from-transparent to-cyan-500/30" />
        COLOR SELECTION
        <div className="h-px w-6 bg-gradient-to-l from-transparent to-cyan-500/30" />
        <div className="w-1 h-1 rotate-45 border border-cyan-500/50" />
      </div>
      
      <div className="flex justify-center gap-4">
        {PLAYER_COLORS.map((color, idx) => {
          const isSelected = idx === selectedIndex;
          return (
            <button
              key={color}
              onClick={() => onSelect(idx)}
              className="relative flex items-center justify-center w-8 h-8 group focus:outline-none"
            >
              {/* Outer Ring Glow (Selected) */}
              {isSelected && (
                <div 
                  className="absolute inset-0 rounded-full animate-[spin_4s_linear_infinite]"
                  style={{ border: `1.5px solid ${color}`, opacity: 0.8, scale: '1.4' }} 
                />
              )}
              
              {/* The circle itself */}
              <div
                className={`w-full h-full rounded-full transition-all duration-300 border-2 ${
                  isSelected 
                    ? 'border-transparent scale-110' 
                    : 'border-transparent opacity-60 hover:opacity-100 hover:scale-110 hover:border-white/20'
                }`}
                style={{ 
                  backgroundColor: color,
                  boxShadow: isSelected ? `0 0 15px ${color}` : 'none'
                }}
              />

              {/* Triangle pointer indicator */}
              {isSelected && (
                <div 
                  className="absolute -bottom-3 w-0 h-0"
                  style={{ 
                    borderLeft: '4px solid transparent',
                    borderRight: '4px solid transparent',
                    borderTop: `6px solid ${color}`
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
