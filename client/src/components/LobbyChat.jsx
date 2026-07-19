import React, { useState, useRef, useEffect } from 'react';
import socket from '../socket/socket.js';
import { EVENTS, TEAM } from '@shared/constants.js';

export default function LobbyChat({ messages, player }) {
  const [text, setText] = useState('');
  const messagesEndRef = useRef(null);

  const handleSend = (e) => {
    e.preventDefault();
    const cleanText = text.trim();
    if (!cleanText) return;

    socket.emit(EVENTS.CHAT_MESSAGE, { text: cleanText });
    setText('');
  };

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-[280px] bg-[#0D0D0D]/90 border border-[#00C9A7]/20 rounded-lg overflow-hidden w-full">
      {/* Header */}
      <div className="bg-[#0D1B2A] border-b border-[#00C9A7]/10 px-4 py-2 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-[#00C9A7] font-bold">
          Transmission Feed
        </span>
        <span className="text-[9px] text-gray-500 font-semibold font-mono uppercase">
          WSS Connection Active
        </span>
      </div>

      {/* Message Feed */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2 flex flex-col">
        {messages.length === 0 && (
          <p className="text-xs text-gray-600 italic m-auto text-center">
            System ready. No transmissions detected.
          </p>
        )}
        {messages.map((msg, index) => {
          let nameColor = 'text-gray-400';
          if (msg.senderTeam === TEAM.A) nameColor = 'text-[#48CAE4]';
          if (msg.senderTeam === TEAM.B) nameColor = 'text-[#E63946]';

          return (
            <div key={index} className="text-xs leading-relaxed break-words bg-gray-900/30 p-2 rounded border border-gray-900/40">
              <span className={`font-bold tracking-wide ${nameColor}`}>
                {msg.senderName}:
              </span>{' '}
              <span className="text-gray-300">{msg.text}</span>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="p-2 border-t border-[#00C9A7]/15 bg-[#0D0D0D] flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type message (max 140 chars)..."
          maxLength={140}
          className="flex-1 px-3 py-2 bg-[#0D1B2A] border border-[#00C9A7]/30 rounded text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#F4A828] transition-colors"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-[#00C9A7] hover:bg-[#00C9A7]/80 text-[#0D0D0D] font-bold rounded uppercase tracking-wider text-[10px] transition-all"
        >
          Send
        </button>
      </form>
    </div>
  );
}
