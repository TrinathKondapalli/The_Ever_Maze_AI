import { create } from 'zustand';
import { PHASE } from '@shared/constants.js';

const initialState = {
  phase: PHASE.LOBBY,
  roomCode: null,
  room: null,
  player: null,
  error: null,
};

export const useGameStore = create((set) => ({
  ...initialState,
  setPhase: (phase) => set({ phase }),
  setRoom: (room) => set({ room }),
  setPlayer: (player) => set({ player }),
  setError: (error) => set({ error }),
  setRoomCode: (roomCode) => set({ roomCode }),
  resetState: () => set(initialState),
}));
