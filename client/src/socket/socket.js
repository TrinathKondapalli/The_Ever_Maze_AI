import { io } from 'socket.io-client';
import { gameStore } from '../store/gameStore.js';
import { EVENTS } from '../constants/index.js';

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? (import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin);
const socket = io(SERVER_URL, { autoConnect: false });

socket.on('connect', () => {
  gameStore.setState({ error: null });
});

socket.on('disconnect', () => {
  gameStore.setState({ error: 'Disconnected from server' });
});

socket.on(EVENTS.ROOM_ERROR, (data) => {
  gameStore.setState({ error: data.message || 'Room error' });
});

socket.on(EVENTS.PLAYER_JOINED, (data) => {
  gameStore.setState({ room: data.room });
});

socket.on(EVENTS.PLAYER_LEFT, (data) => {
  if (data.playerId === socket.id) {
    gameStore.reset();
    gameStore.setState({ error: 'You left the room' });
  } else {
    gameStore.setState({ room: data.room });
  }
});

socket.on(EVENTS.ROOM_UPDATE, (data) => {
  gameStore.setState({ room: data.room });
});

socket.on(EVENTS.PHASE_CHANGE, (data) => {
  if (data.phase === 'EXPLORE') {
    gameStore.setState({ phase: 'game' });
  } else if (data.phase === 'LOBBY') {
    gameStore.setState({ phase: 'lobby' });
  }
});

socket.on(EVENTS.STATE_UPDATE, (data) => {
  const currentState = gameStore.getState();
  if (currentState.room && data.players) {
    // Only update the dynamic state, preserving the static maze to avoid deep copy overhead
    gameStore.setState({
      room: {
        ...currentState.room,
        players: data.players,
        match: {
          ...currentState.room.match,
          ...data.match,
          maze: currentState.room.match.maze // preserve maze
        }
      }
    });
  }
});

socket.on(EVENTS.CHAT_MESSAGE_RECEIVED, (message) => {
  gameStore.addChatMessage(message);
});

socket.on(EVENTS.MATCH_END, (data) => {
  const currentState = gameStore.getState();
  if (currentState.room) {
    gameStore.setState({
      room: {
        ...currentState.room,
        match: {
          ...currentState.room.match,
          phase: 'MATCH_END',
          result: data
        }
      }
    });
  }
});

export default socket;
