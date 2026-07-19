import React, { useState } from 'react';
import NameEntry from './NameEntry.jsx';
import socket from '../socket/socket.js';
import { EVENTS } from '@shared/constants.js';

export default function LandingPage({ hasSession, player, onRegisterName, onLogout }) {
  const [roomCode, setRoomCode] = useState('');
  const [joinError, setJoinError] = useState('');

  const handleCreateRoom = () => {
    socket.emit(EVENTS.CREATE_ROOM, { playerName: player.name });
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    const code = roomCode.trim().toUpperCase();

    // Basic 6-character alpha-numeric check excluding confusing characters: 0, O, I, l
    const confusingCharsRegex = /[0OIl]/;
    if (code.length !== 6) {
      setJoinError('Room code must be exactly 6 characters.');
      return;
    }

    if (confusingCharsRegex.test(code)) {
      setJoinError('Invalid characters. Room codes do not contain 0, O, I, or l.');
      return;
    }

    setJoinError('');
    socket.emit(EVENTS.JOIN_ROOM, { roomCode: code, playerName: player.name });
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between items-center text-white px-4">
      {/* ── Top News Ticker ── */}
      <div className="w-full bg-[#0D0D0D]/80 border-b border-[#00C9A7]/20 py-2 overflow-hidden backdrop-blur-sm">
        <div className="flex animate-[marquee_20s_linear_infinite] whitespace-nowrap gap-16 text-xs uppercase tracking-widest text-[#00C9A7] font-semibold">
          <span>⚡ Welcome to Lumina alpha v1.0</span>
          <span>💎 Two Teams. One Treasure. One Winner.</span>
          <span>🚀 Instant browser-based 3D multiplayer action</span>
          <span>🛡️ Server authoritative anticheat active</span>
          <span>⚡ Welcome to Lumina alpha v1.0</span>
        </div>
      </div>

      {/* ── Main Panel ── */}
      <div className="flex-1 flex items-center justify-center w-full max-w-md my-8">
        <div className="w-full bg-[#0D0D0D]/90 border border-[#00C9A7]/20 rounded-xl p-8 shadow-[0_0_40px_rgba(0,0,0,0.8)] backdrop-blur-md flex flex-col items-center">
          {/* Logo / Title */}
          <h1 className="text-5xl font-black tracking-[0.25em] text-transparent bg-clip-text bg-gradient-to-r from-[#F4A828] to-[#F4A261] mb-2 uppercase select-none drop-shadow-[0_2px_10px_rgba(244,168,40,0.3)] font-cinzel">
            Lumina
          </h1>
          <p className="text-xs uppercase tracking-[0.18em] text-[#00C9A7] font-bold mb-8 text-center select-none">
            Two Teams · One Treasure · One Exit
          </p>

          {!hasSession ? (
            <NameEntry onSubmit={onRegisterName} />
          ) : (
            <div className="w-full flex flex-col items-center gap-6">
              {/* Authenticated Player Status */}
              <div className="flex justify-between items-center w-full bg-[#0D1B2A]/60 border border-[#00C9A7]/10 px-4 py-3 rounded-md">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00C9A7] animate-ping" />
                  <span className="text-sm font-semibold tracking-wider text-gray-200">
                    {player.name}
                  </span>
                </div>
                <button
                  onClick={onLogout}
                  className="text-[10px] uppercase font-bold tracking-widest text-[#E63946] hover:text-[#E63946]/80 transition-colors"
                >
                  Disconnect
                </button>
              </div>

              {/* Play buttons */}
              <div className="w-full flex flex-col gap-4">
                <button
                  onClick={handleCreateRoom}
                  className="w-full py-3.5 px-6 bg-[#F4A828] hover:bg-[#F4A828]/90 text-[#0D0D0D] font-bold rounded-md uppercase tracking-wider transition-all duration-150 active:scale-[0.98] shadow-[0_4px_15px_rgba(244,168,40,0.25)] text-sm"
                >
                  Create Room
                </button>

                <div className="relative flex py-3 items-center">
                  <div className="flex-grow border-t border-gray-800"></div>
                  <span className="flex-shrink mx-4 text-[10px] text-gray-600 uppercase tracking-widest font-bold">
                    Or Join Room
                  </span>
                  <div className="flex-grow border-t border-gray-800"></div>
                </div>

                <form onSubmit={handleJoinRoom} className="w-full flex gap-2">
                  <div className="flex-1 flex flex-col">
                    <input
                      type="text"
                      value={roomCode}
                      onChange={(e) => {
                        setRoomCode(e.target.value.toUpperCase());
                        if (joinError) setJoinError('');
                      }}
                      placeholder="ENTER CODE"
                      maxLength={6}
                      className="w-full px-4 py-3 bg-[#0D1B2A]/90 border border-[#00C9A7]/40 rounded-md text-white placeholder-gray-600 focus:outline-none focus:border-[#F4A828] focus:ring-1 focus:ring-[#F4A828] transition-all text-center tracking-[0.25em] font-mono font-bold text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    className="py-3 px-6 bg-[#00C9A7] hover:bg-[#00C9A7]/80 text-[#0D0D0D] font-bold rounded-md uppercase tracking-wider transition-all duration-150 active:scale-[0.98]"
                  >
                    Join
                  </button>
                </form>
                {joinError && (
                  <p className="text-[11px] text-[#E63946] font-semibold text-center mt-1">
                    {joinError}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="w-full py-4 text-center text-[10px] uppercase tracking-widest text-gray-600 font-semibold border-t border-gray-900 bg-[#0D0D0D]/60 backdrop-blur-sm">
        Confidential · Lumina Production Build v1.0
      </footer>
    </div>
  );
}
