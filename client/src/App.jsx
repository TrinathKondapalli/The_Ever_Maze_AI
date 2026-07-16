import { useState, useEffect } from 'react';
import socket from './socket/socket.js';
import { EVENTS } from './constants/index.js';

export default function App() {
  const [view, setView] = useState('landing');
  const [socketReady, setSocketReady] = useState(false);

  useEffect(() => {
    socket.connect();
    socket.on('connect', () => setSocketReady(true));
    socket.on(EVENTS.ROOM_ERROR, (data) => console.log('Room message:', data.message));
    return () => socket.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-neutral-900 text-white flex items-center justify-center font-sans">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">The Ever Maze</h1>
        <div className="p-4 border border-neutral-700 rounded-lg bg-neutral-800">
          <p className="text-xl">Current View: <span className="font-mono text-emerald-400">{view}</span></p>
          <p className="text-sm text-neutral-400 mt-2">Socket status: {socketReady ? 'Connected' : 'Connecting...'}</p>
        </div>
        <div className="mt-8 flex gap-4 justify-center">
          <button onClick={() => setView('landing')} className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 rounded">Landing</button>
          <button onClick={() => setView('lobby')} className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 rounded">Lobby</button>
          <button onClick={() => setView('game')} className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 rounded">Game</button>
        </div>
      </div>
    </div>
  );
}
