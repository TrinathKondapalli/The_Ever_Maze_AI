import React, { useEffect, useState } from 'react';
import socket from '../../socket/socket.js';
import { gameStore } from '../../store/gameStore.js';
import { EVENTS } from '../../constants/index.js';

export default function ProfileModal({ onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const profileId = gameStore.getState().profileId;
    socket.emit(EVENTS.GET_PROFILE, { profileId }, (res) => {
      if (res && res.success) {
        setProfile(res.profile);
      }
      setLoading(false);
    });
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="bg-slate-800 p-8 rounded-xl shadow-2xl w-full max-w-md relative border border-slate-700">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          ✕
        </button>
        
        <h2 className="text-3xl font-bold text-cyan-400 mb-6 text-center">Your Profile</h2>
        
        {loading ? (
          <div className="text-center text-slate-400 py-8">Loading stats...</div>
        ) : profile ? (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="text-sm text-slate-400 uppercase tracking-widest mb-1">Player Name</div>
              <div className="text-2xl font-bold text-white">{profile.username}</div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600 text-center">
                <div className="text-3xl font-bold text-emerald-400 mb-1">{profile.totalWins}</div>
                <div className="text-xs text-slate-400 uppercase font-semibold">Matches Won</div>
              </div>
              <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600 text-center">
                <div className="text-3xl font-bold text-white mb-1">{profile.totalGames}</div>
                <div className="text-xs text-slate-400 uppercase font-semibold">Matches Played</div>
              </div>
              <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600 text-center">
                <div className="text-3xl font-bold text-pink-400 mb-1">{profile.totalTags}</div>
                <div className="text-xs text-slate-400 uppercase font-semibold">Total Tags</div>
              </div>
              <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600 text-center">
                <div className="text-3xl font-bold text-yellow-400 mb-1">{profile.totalEscapes}</div>
                <div className="text-xs text-slate-400 uppercase font-semibold">Successful Escapes</div>
              </div>
            </div>
            
            <div className="text-center text-xs text-slate-500 mt-6 pt-4 border-t border-slate-700">
              Profile ID: {gameStore.getState().profileId.split('_')[1] || 'Unknown'}...
            </div>
          </div>
        ) : (
          <div className="text-center text-red-400 py-8">Failed to load profile. Make sure server is running.</div>
        )}
      </div>
    </div>
  );
}
