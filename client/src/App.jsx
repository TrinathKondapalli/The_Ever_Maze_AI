import React from 'react';
import { useGameStore } from './hooks/useGameStore.js';
import LandingScreen from './components/Lobby/LandingScreen.jsx';
import LobbyScreen from './components/Lobby/LobbyScreen.jsx';
import GameScreen3D from './components/Game/Renderer3D/GameScreen3D.jsx';

export default function App() {
  const { phase } = useGameStore();

  return (
    <>
      {phase === 'landing' && <LandingScreen />}
      {phase === 'lobby' && <LobbyScreen />}
      {phase === 'game' && <GameScreen3D />}
    </>
  );
}
