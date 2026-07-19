import React, { useEffect } from 'react';
import { useUiStore } from './store/uiStore.js';
import { useGameStore } from './store/gameStore.js';
import { UI_SCREEN, EVENTS, MATCH_STATE } from '@shared/constants.js';
import { useSession } from './auth/useSession.js';
import LandingPage from './components/LandingPage.jsx';
import HeroCanvas from './components/HeroCanvas.jsx';
import Lobby from './components/Lobby.jsx';
import GameWorld from './components/GameWorld.jsx';
import VictoryScreen from './components/VictoryScreen.jsx';
import socket from './socket/socket.js';

// ── App Shell ────────────────────────────────────────────────────────
export default function App() {
  const screen = useUiStore((state) => state.screen);
  const setScreen = useUiStore((state) => state.setScreen);
  const chatMessages = useUiStore((state) => state.chatMessages);
  const addChatMessage = useUiStore((state) => state.addChatMessage);
  const clearChat = useUiStore((state) => state.clearChat);

  const player = useGameStore((state) => state.player);
  const room = useGameStore((state) => state.room);
  const setRoom = useGameStore((state) => state.setRoom);
  const mapSeed          = useGameStore((s) => s.mapSeed);
  const setMapSeed        = useGameStore((s) => s.setMapSeed);
  const setRemotePlayer    = useGameStore((s) => s.setRemotePlayer);
  const removeRemotePlayer = useGameStore((s) => s.removeRemotePlayer);
  const setTreasure        = useGameStore((s) => s.setTreasure);

  const { isInitializing, hasSession, startSession, clearSession } = useSession();

  const [winData, setWinData] = React.useState(null);

  // Socket sync listeners
  useEffect(() => {
    socket.on(EVENTS.ROOM_UPDATE, ({ room }) => {
      setRoom(room);
      if (room) {
        if (room.matchState === MATCH_STATE.ROOM_LOBBY || room.matchState === MATCH_STATE.COUNTDOWN) {
          setScreen(UI_SCREEN.LOBBY);
        } else if (room.matchState === MATCH_STATE.MAP_LOADING) {
          setScreen(UI_SCREEN.GAME); // Transition to game view
        }
      } else {
        // Returned to landing page
        setScreen(UI_SCREEN.LANDING);
        clearChat();
      }
    });

    socket.on(EVENTS.MATCH_START, ({ seed }) => {
      console.log(`[App] Match start, setting seed: ${seed}`);
      setMapSeed(seed);
    });

    socket.on(EVENTS.PLAYER_ELIMINATED, ({ id }) => removeRemotePlayer(id));

    // Treasure — revealed / found event
    socket.on(EVENTS.TREASURE_FOUND, ({ treasure }) => {
      if (treasure) setTreasure(treasure);
    });

    // STATE_UPDATE also carries treasure snapshot each tick
    socket.on(EVENTS.STATE_UPDATE, ({ players, treasure: tSnap }) => {
      if (players) Object.values(players).forEach((snap) => setRemotePlayer(snap));
      if (tSnap)   setTreasure(tSnap);
    });

    socket.on(EVENTS.CHAT_MESSAGE, ({ message }) => {
      addChatMessage(message);
    });

    socket.on(EVENTS.ROOM_ERROR, ({ message }) => {
      alert(message);
    });

    socket.on(EVENTS.MATCH_WIN, (data) => {
      setWinData(data);
      setScreen(UI_SCREEN.VICTORY);
    });

    socket.on(EVENTS.MATCH_DRAW, (data) => {
      setWinData(data);
      setScreen(UI_SCREEN.VICTORY);
    });

    return () => {
      socket.off(EVENTS.ROOM_UPDATE);
      socket.off(EVENTS.MATCH_START);
      socket.off(EVENTS.STATE_UPDATE);
      socket.off(EVENTS.PLAYER_ELIMINATED);
      socket.off(EVENTS.TREASURE_FOUND);
      socket.off(EVENTS.CHAT_MESSAGE);
      socket.off(EVENTS.ROOM_ERROR);
      socket.off(EVENTS.MATCH_WIN);
      socket.off(EVENTS.MATCH_DRAW);
    };
  }, [setRoom, setScreen, setMapSeed, setRemotePlayer, removeRemotePlayer, setTreasure, addChatMessage, clearChat]);

  if (isInitializing) {
    return (
      <div style={styles.root}>
        <div className="text-center">
          <p className="text-sm uppercase tracking-widest text-[#00C9A7] animate-pulse">
            Connecting to Lumina...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.root}>
      {/* Background 3D scene only on landing screen */}
      {screen === UI_SCREEN.LANDING && <HeroCanvas />}

      {screen === UI_SCREEN.LANDING && (
        <LandingPage
          hasSession={hasSession}
          player={player}
          onRegisterName={startSession}
          onLogout={clearSession}
        />
      )}
      {screen === UI_SCREEN.LOBBY && room && (
        <Lobby
          room={room}
          localPlayerId={socket.id}
          chatMessages={chatMessages}
        />
      )}
      {screen === UI_SCREEN.GAME && mapSeed && (
        <GameWorld seed={mapSeed} />
      )}
      {screen === UI_SCREEN.VICTORY && (
        <VictoryScreen 
          winData={winData} 
          onReturnToLobby={() => {
            // Usually the server forces this transition via ROOM_UPDATE,
            // but we can allow early exit locally. We should ideally
            // leave room or just wait for server. Let's just wait for server,
            // or switch to LOBBY (which ROOM_UPDATE will do anyway).
            setScreen(UI_SCREEN.LOBBY);
          }} 
        />
      )}
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
