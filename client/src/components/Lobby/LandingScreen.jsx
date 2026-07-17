import React, { useState } from 'react';
import socket from '../../socket/socket.js';
import { gameStore } from '../../store/gameStore.js';
import { EVENTS } from '../../constants/index.js';
import ProfileModal from './ProfileModal.jsx';

export default function LandingScreen() {
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState(null);

  const handleCreate = () => {
    if (name.length < 2) return setError('Name must be at least 2 characters');
    setError(null);
    const profileId = gameStore.getState().profileId;
    socket.emit(EVENTS.CREATE_ROOM, { playerName: name, profileId, settings: {} }, (res) => {
      if (res.success) {
        gameStore.setState({
          roomCode: res.roomCode,
          room: res.room,
          player: res.player,
          phase: 'lobby'
        });
      } else {
        setError(res.error);
      }
    });
  };

  const handleJoin = () => {
    if (name.length < 2) return setError('Name must be at least 2 characters');
    if (roomCode.length !== 6) return setError('Room code must be 6 characters');
    setError(null);
    const profileId = gameStore.getState().profileId;
    socket.emit(EVENTS.JOIN_ROOM, { roomCode, playerName: name, profileId }, (res) => {
      if (res.success) {
        gameStore.setState({
          roomCode: res.roomCode,
          room: res.room,
          player: res.player,
          phase: 'lobby'
        });
      } else {
        setError(res.error);
      }
    });
  };

  const [showProfile, setShowProfile] = useState(false);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
      <div className="bg-slate-800 p-8 rounded-xl shadow-2xl w-full max-w-md">
        <h1 className="text-4xl font-bold text-center mb-8 text-cyan-400 tracking-wider">THE EVER MAZE</h1>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Player Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="Enter your name"
              maxLength={20}
            />
          </div>

          {error && <div className="text-red-400 text-sm bg-red-900/30 p-3 rounded">{error}</div>}

          {!isJoining ? (
            <div className="space-y-4">
              <button 
                onClick={handleCreate}
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-4 rounded-lg transition-colors"
              >
                Create Room
              </button>
              <button 
                onClick={() => setIsJoining(true)}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
              >
                Join Existing Room
              </button>
              <button 
                onClick={() => setShowProfile(true)}
                className="w-full bg-transparent border border-slate-600 text-slate-300 hover:text-white hover:border-slate-400 font-bold py-3 px-4 rounded-lg transition-colors"
              >
                View Profile
              </button>
            </div>
          ) : (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Room Code</label>
                <input 
                  type="text" 
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 uppercase tracking-widest"
                  placeholder="6-CHARACTER CODE"
                  maxLength={6}
                />
              </div>
              <button 
                onClick={handleJoin}
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-4 rounded-lg transition-colors"
              >
                Join Room
              </button>
              <button 
                onClick={() => setIsJoining(false)}
                className="w-full text-slate-400 hover:text-white text-sm py-2"
              >
                Back
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
