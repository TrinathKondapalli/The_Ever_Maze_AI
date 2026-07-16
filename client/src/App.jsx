import { useState, useEffect } from 'react';
import socket from './socket/socket.js';
import { EVENTS } from './constants/index.js';

export default function App() {
  const [socketReady, setSocketReady] = useState(false);
  const [socketId, setSocketId] = useState('none');
  const [pongMessage, setPongMessage] = useState('');
  const [healthMessage, setHealthMessage] = useState('');

  useEffect(() => {
    socket.connect();
    socket.on('connect', () => {
      console.log('Socket connected');
      setSocketReady(true);
      setSocketId(socket.id);
    });
    socket.on('pong_response', (data) => {
      setPongMessage(`Pong received at ${data.time}`);
    });
    socket.on(EVENTS.ROOM_ERROR, (data) => console.log('Room message:', data.message));
    return () => socket.disconnect();
  }, []);

  const sendPing = () => {
    socket.emit('ping_request');
  };

  const checkHealth = async () => {
    try {
      const res = await fetch('http://localhost:3001/health');
      const data = await res.json();
      setHealthMessage(JSON.stringify(data));
    } catch (err) {
      setHealthMessage(err.toString());
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-white flex flex-col items-center justify-center font-sans">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">The Ever Maze - Test</h1>
        <div className="p-4 border border-neutral-700 rounded-lg bg-neutral-800 flex flex-col gap-2">
          <p className="text-xl">Status: <span className="font-mono text-emerald-400">{socketReady ? 'Connected ✓' : 'Connecting...'}</span></p>
          <p className="text-sm text-neutral-400">Socket ID: {socketId}</p>
        </div>
        <div className="mt-8 flex gap-4 justify-center">
          <button onClick={sendPing} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded">Send Ping</button>
          <button onClick={checkHealth} className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded">Check Health</button>
        </div>
        <div className="mt-4">
          <p>{pongMessage}</p>
          <p>{healthMessage}</p>
        </div>
      </div>
    </div>
  );
}
