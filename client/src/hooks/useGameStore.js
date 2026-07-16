import { useSyncExternalStore } from 'react';
import { gameStore } from '../store/gameStore.js';

export function useGameStore() {
  return useSyncExternalStore(gameStore.subscribe, gameStore.getState);
}
