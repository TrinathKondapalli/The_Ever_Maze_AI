import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../../hooks/useGameStore.js';
import socket from '../../socket/socket.js';
import { EVENTS } from '../../constants/index.js';

export default function ChatBox({ inGame = false }) {
  const { chatMessages, player } = useGameStore();
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const timeoutRef = useRef(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    
    // In-game auto-fade logic
    if (inGame) {
      setIsActive(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (!isTyping) {
        timeoutRef.current = setTimeout(() => {
          setIsActive(false);
        }, 5000);
      }
    }
  }, [chatMessages, isTyping, inGame]);

  // Global keydown to focus chat when pressing Enter
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.key === 'Enter') {
        if (document.activeElement !== inputRef.current) {
          e.preventDefault();
          setIsTyping(true);
          inputRef.current?.focus();
        } else {
          // If already focused, submit message
          e.preventDefault();
          sendMessage();
        }
      } else if (e.key === 'Escape') {
        setIsTyping(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [inputValue]);

  const sendMessage = () => {
    if (!inputValue.trim()) {
      setIsTyping(false);
      inputRef.current?.blur();
      return;
    }
    
    socket.emit(EVENTS.SEND_CHAT_MESSAGE, { text: inputValue });
    setInputValue('');
    setIsTyping(false);
    inputRef.current?.blur();
  };

  const containerClasses = inGame
    ? `absolute bottom-4 right-4 w-80 z-30 transition-opacity duration-300 rounded-xl flex flex-col pointer-events-auto ${isActive || isTyping ? 'opacity-100 bg-slate-900/90 border border-slate-600 shadow-2xl' : 'opacity-60 bg-slate-900/60 border border-slate-700/30'}`
    : "w-full h-64 bg-slate-800 rounded-xl border border-slate-700 shadow-inner flex flex-col mt-6";

  return (
    <div className={containerClasses} onClick={() => { setIsTyping(true); inputRef.current?.focus(); }}>
      {/* Messages List */}
      <div className={`flex-1 overflow-y-auto p-3 space-y-2 text-sm max-h-40`}>
        {chatMessages.map((msg) => (
          <div key={msg.id} className="break-words">
            {msg.isSystem ? (
              <span className="text-slate-400 italic text-xs">{msg.text}</span>
            ) : (
              <span>
                <span className={`font-bold mr-2 ${msg.senderTeam === 'A' ? 'text-cyan-400' : 'text-pink-400'}`}>
                  {msg.senderName}:
                </span>
                <span className="text-slate-200">{msg.text}</span>
              </span>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Field */}
      <div className="p-2 border-t border-slate-700/50">
        <input
          ref={inputRef}
          type="text"
          className={`w-full bg-slate-950/50 text-slate-200 rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-cyan-500 transition-all placeholder-slate-500`}
          placeholder="Press Enter to chat..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => setIsTyping(true)}
          onBlur={() => setIsTyping(false)}
          maxLength={100}
        />
      </div>
    </div>
  );
}
