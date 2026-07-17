import React from 'react';
import { useGameStore } from './hooks/useGameStore.js';
import LandingScreen from './components/Lobby/LandingScreen.jsx';
import LobbyScreen from './components/Lobby/LobbyScreen.jsx';
import GameScreen from './components/Game/GameScreen.jsx';

export default function App() {
  const { phase } = useGameStore();

  return (
    <>
      {phase === 'landing' && <LandingScreen />}
      {phase === 'lobby' && <LobbyScreen />}
      {phase === 'game' && <GameScreen />}
    </>
  );
}
