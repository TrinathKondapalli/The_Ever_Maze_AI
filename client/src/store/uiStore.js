import { create } from 'zustand';
import { UI_SCREEN } from '@shared/constants.js';

export const useUiStore = create((set) => ({
  // Current top-level screen
  screen: UI_SCREEN.LANDING,

  // Loading state (map load, connecting, etc.)
  isLoading: false,
  loadingMessage: '',

  // Chat messages in lobby (and HUD)
  chatMessages: [],

  // Error overlay
  error: null,

  // Actions
  setScreen: (screen) => set({ screen }),

  setLoading: (isLoading, message = '') =>
    set({ isLoading, loadingMessage: message }),

  addChatMessage: (msg) =>
    set((state) => ({
      chatMessages: [...state.chatMessages.slice(-99), msg], // keep last 100
    })),

  clearChat: () => set({ chatMessages: [] }),

  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
}));
