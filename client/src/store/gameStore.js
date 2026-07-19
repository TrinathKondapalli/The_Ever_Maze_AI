import { create } from 'zustand';
import { MATCH_STATE, TREASURE_STATE } from '@shared/constants.js';

const initialState = {
  phase: MATCH_STATE.ROOM_LOBBY,
  roomCode: null,
  room: null,
  player: null,
  error: null,
  mapSeed: null,
  // Map of id → { id, name, team, health, x, y, z, yaw, seq }
  remotePlayers: {},
  // Treasure state synced from server STATE_UPDATE / TREASURE_FOUND events
  treasure: {
    state:     TREASURE_STATE.HIDDEN,
    carrierId: null,   // socket.id of carrier, null if on ground
    x:         null,   // world X when on ground / dropped
    z:         null,   // world Z when on ground / dropped
  },
};

export const useGameStore = create((set) => ({
  ...initialState,
  setPhase:    (phase)    => set({ phase }),
  setRoom:     (room)     => set({ room }),
  setPlayer:   (player)   => set({ player }),
  setError:    (error)    => set({ error }),
  setRoomCode: (roomCode) => set({ roomCode }),
  setMapSeed:  (mapSeed)  => set({ mapSeed }),

  /**
   * Upsert a single remote player snapshot.
   * @param {object} snapshot  { id, name, team, health, x, y, z, yaw, seq }
   */
  setRemotePlayer: (snapshot) =>
    set((state) => ({
      remotePlayers: { ...state.remotePlayers, [snapshot.id]: snapshot },
    })),

  /**
   * Remove a remote player when they disconnect or leave.
   * @param {string} id
   */
  removeRemotePlayer: (id) =>
    set((state) => {
      const next = { ...state.remotePlayers };
      delete next[id];
      return { remotePlayers: next };
    }),

  /**
   * Update treasure state from server snapshot.
   * @param {object} snap  { state, carrierId, x, z }
   */
  setTreasure: (snap) => set({ treasure: snap }),

  resetState: () => set(initialState),
}));

