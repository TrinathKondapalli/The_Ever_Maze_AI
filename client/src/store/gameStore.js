let state = {
  roomCode: null,
  room: null,
  player: null,
  phase: 'landing', // 'landing', 'lobby', 'game'
  error: null,
  chatMessages: [],
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
  addChatMessage: (msg) => {
    state = { ...state, chatMessages: [...state.chatMessages, msg] };
    emit();
  },
  reset: () => {
    const profileId = state.profileId;
    state = {
      roomCode: null,
      room: null,
      player: null,
      phase: 'landing',
      error: null,
      chatMessages: [],
      profileId
    };
    emit();
  }
};
