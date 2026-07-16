let state = {
  roomCode: null,
  room: null,
  player: null,
  phase: 'landing', // 'landing', 'lobby', 'game'
  error: null
};

const listeners = new Set();

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

export const gameStore = {
  getState: () => state,
  subscribe: (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  setState: (newState) => {
    state = { ...state, ...newState };
    emit();
  },
  reset: () => {
    state = {
      roomCode: null,
      room: null,
      player: null,
      phase: 'landing',
      error: null
    };
    emit();
  }
};
