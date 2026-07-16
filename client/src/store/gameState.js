export const initialGameState = {
  phase: null,
  myPlayerId: null,
  myTeam: null,
  players: {},
  maze: null,
  lostLight: { carrierId: null, position: null, isOnFloor: false },
  gifts: [],
  myGift: null,
  exit: null,
  channel: null,
  matchTimer: 0,
  roomCode: null,
  roomPlayers: [],
};
export let gameState = { ...initialGameState };
export function resetGameState() {
  gameState = { ...initialGameState };
  return gameState;
}
