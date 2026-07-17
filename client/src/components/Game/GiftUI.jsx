import React from 'react';
import { GIFT } from '../../constants/index.js';

export default function GiftUI({ activeGift, onUseGift }) {
  if (!activeGift) return null;

  let giftName = '';
  let giftColor = '';
  let icon = '';

  switch (activeGift) {
    case GIFT.DASH:
      giftName = 'DASH';
      giftColor = 'text-green-400 border-green-500 shadow-[0_0_15px_rgba(74,222,128,0.5)]';
      icon = '⚡';
      break;
    case GIFT.FREEZE:
      giftName = 'FREEZE';
      giftColor = 'text-blue-400 border-blue-500 shadow-[0_0_15px_rgba(96,165,250,0.5)]';
      icon = '❄️';
      break;
    case GIFT.SHIELD:
      giftName = 'SHIELD';
      giftColor = 'text-purple-400 border-purple-500 shadow-[0_0_15px_rgba(192,132,252,0.5)]';
      icon = '🛡️';
      break;
    case GIFT.COMPASS:
      giftName = 'COMPASS';
      giftColor = 'text-yellow-400 border-yellow-500 shadow-[0_0_15px_rgba(250,204,21,0.5)]';
      icon = '🧭';
      break;
    default:
      giftName = activeGift;
      giftColor = 'text-white border-slate-500 shadow-md';
      icon = '🎁';
  }

  return (
    <div className="absolute bottom-8 right-8 z-30 flex flex-col items-center">
      <button 
        onClick={onUseGift}
        className={`w-24 h-24 rounded-full bg-slate-900 border-4 flex flex-col items-center justify-center transition-transform hover:scale-105 active:scale-95 ${giftColor}`}
      >
        <span className="text-3xl mb-1">{icon}</span>
        <span className="font-black text-xs tracking-wider">{giftName}</span>
      </button>
      <div className="mt-3 px-3 py-1 bg-slate-900/80 rounded-full border border-slate-700 text-slate-300 text-[10px] font-bold tracking-widest uppercase">
        <span className="hidden sm:inline">Press SPACE</span>
        <span className="sm:hidden">TAP TO USE</span>
      </div>
    </div>
  );
}
