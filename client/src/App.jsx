import React from 'react';
import { useUiStore } from './store/uiStore.js';
import { UI_SCREEN } from '@shared/constants.js';

// ── View Stubs (will be replaced module by module) ──────────────────
const LandingView = () => (
  <div style={styles.view}>
    <h1 style={styles.title}>LUMINA</h1>
    <p style={styles.tagline}>Two Teams. One Treasure. One Winner.</p>
    <p style={styles.stub}>[ Module 03: Landing UI — PENDING ]</p>
  </div>
);

const LobbyView = () => (
  <div style={styles.view}>
    <h2 style={styles.title}>Lobby</h2>
    <p style={styles.stub}>[ Module 04: Lobby System — PENDING ]</p>
  </div>
);

const GameView = () => (
  <div style={styles.view}>
    <h2 style={styles.title}>Game</h2>
    <p style={styles.stub}>[ Module 06+: Game World — PENDING ]</p>
  </div>
);

// ── App Shell ────────────────────────────────────────────────────────
export default function App() {
  const screen = useUiStore((state) => state.screen);

  return (
    <div style={styles.root}>
      {screen === UI_SCREEN.LANDING && <LandingView />}
      {screen === UI_SCREEN.LOBBY && <LobbyView />}
      {screen === UI_SCREEN.GAME && <GameView />}
    </div>
  );
}

// ── Inline styles (replaced by Tailwind in Module 03) ────────────────
const styles = {
  root: {
    minHeight: '100vh',
    background: '#0D1B2A',
    color: '#ffffff',
    fontFamily: 'sans-serif',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  view: {
    textAlign: 'center',
    padding: '40px',
  },
  title: {
    fontSize: '48px',
    fontWeight: 'bold',
    color: '#F4A828',
    marginBottom: '16px',
    letterSpacing: '8px',
  },
  tagline: {
    fontSize: '18px',
    color: '#00C9A7',
    marginBottom: '32px',
  },
  stub: {
    fontSize: '14px',
    color: '#666',
    fontStyle: 'italic',
  },
};
