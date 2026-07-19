import { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore.js';
import { useUiStore } from '../store/uiStore.js';
import { UI_SCREEN } from '@shared/constants.js';
import socket from '../socket/socket.js';

const SESSION_KEY = 'lumina_session_id';
const NAME_KEY = 'lumina_player_name';

/**
 * Generates a standard UUID v4.
 * @returns {string}
 */
export function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Custom React hook to manage guest-based persistent sessionStorage player authentication.
 */
export function useSession() {
  const setPlayer = useGameStore((state) => state.setPlayer);
  const setScreen = useUiStore((state) => state.setScreen);
  const [isInitializing, setIsInitializing] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    // Attempt to restore session on mount
    const storedId = sessionStorage.getItem(SESSION_KEY);
    const storedName = sessionStorage.getItem(NAME_KEY);

    if (storedId && storedName) {
      // Connect socket with credentials
      socket.auth = { sessionId: storedId, playerName: storedName };
      socket.connect();
      
      setPlayer({ sessionId: storedId, name: storedName });
      setHasSession(true);
      setScreen(UI_SCREEN.LANDING);
    } else {
      setHasSession(false);
    }
    
    setIsInitializing(false);
  }, [setPlayer, setScreen]);

  /**
   * Initializes a fresh session with the given player name.
   * @param {string} name
   */
  const startSession = (name) => {
    const cleanName = name.trim().substring(0, 20);
    const newSessionId = generateUUID();

    sessionStorage.setItem(SESSION_KEY, newSessionId);
    sessionStorage.setItem(NAME_KEY, cleanName);

    socket.auth = { sessionId: newSessionId, playerName: cleanName };
    socket.connect();

    setPlayer({ sessionId: newSessionId, name: cleanName });
    setHasSession(true);
    setScreen(UI_SCREEN.LANDING);
  };

  /**
   * Cleans up the current session.
   */
  const clearSession = () => {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(NAME_KEY);
    socket.disconnect();
    setPlayer(null);
    setHasSession(false);
  };

  return {
    isInitializing,
    hasSession,
    startSession,
    clearSession,
  };
}
