import React from 'react';
import { Shield, Trash2, CheckCircle2, Clock } from 'lucide-react';
import { TEAM } from '@shared/constants.js';

/**
 * PlayerCard Component
 * Displays a player's name, ready state, team status, and host tools (if applicable).
 * 
 * @param {object} props
 * @param {object} props.player The player object to render
 * @param {boolean} props.isLocalHost Whether the local client is the host
 * @param {string} props.localSocketId The socket ID of the local client
 * @param {function} props.onKick Callback to kick this player
 */
export default function PlayerCard({ player, isLocalHost, localSocketId, onKick }) {
  const isSelf = player.id === localSocketId;

  // Determine card borders/accents based on team
  let teamBadgeColor = 'bg-gray-800 text-gray-400';
  let cardBorder = 'border-gray-800/40 bg-gray-900/60';
  
  if (player.team === TEAM.A) {
    teamBadgeColor = 'bg-[#2563EB]/20 text-[#48CAE4] border border-[#2563EB]/40';
    cardBorder = 'border-[#2563EB]/30 bg-[#2563EB]/5';
  } else if (player.team === TEAM.B) {
    teamBadgeColor = 'bg-[#DC2626]/20 text-[#E63946] border border-[#DC2626]/40';
    cardBorder = 'border-[#DC2626]/30 bg-[#DC2626]/5';
  }

  return (
    <div className={`flex items-center justify-between p-3.5 rounded-lg border transition-all duration-150 ${cardBorder}`}>
      {/* Player details */}
      <div className="flex items-center gap-3">
        {/* Avatar Placeholder Dot */}
        <div className={`w-3 h-3 rounded-full ${
          player.team === TEAM.A ? 'bg-[#48CAE4]' : 
          player.team === TEAM.B ? 'bg-[#E63946]' : 'bg-gray-500'
        }`} />

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold tracking-wide ${isSelf ? 'text-white' : 'text-gray-300'}`}>
              {player.name} {isSelf && <span className="text-[10px] text-gray-500 italic">(You)</span>}
            </span>
            
            {player.isHost && (
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-[#F4A828]/20 text-[#F4A828] text-[9px] font-bold tracking-widest rounded-full uppercase border border-[#F4A828]/30">
                <Shield size={8} /> Host
              </span>
            )}
          </div>
          <span className="text-[10px] text-gray-500 font-mono tracking-wider">
            ID: {player.id.substring(0, 6)}...
          </span>
        </div>
      </div>

      {/* Status & Actions */}
      <div className="flex items-center gap-3">
        {player.isHost ? (
          <span className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold">
            Organizing
          </span>
        ) : player.isReady ? (
          <span className="flex items-center gap-1 text-[11px] text-[#00C9A7] font-bold uppercase tracking-wider">
            <CheckCircle2 size={12} /> Ready
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[11px] text-gray-500 uppercase tracking-wider font-semibold">
            <Clock size={12} /> Waiting
          </span>
        )}

        {/* Host Kick Action */}
        {isLocalHost && !player.isHost && (
          <button
            onClick={() => onKick(player.id)}
            className="p-1.5 hover:bg-red-950/40 text-gray-500 hover:text-[#E63946] rounded transition-all active:scale-95"
            title={`Kick ${player.name}`}
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
