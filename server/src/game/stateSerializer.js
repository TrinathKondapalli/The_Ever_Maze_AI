/**
 * stateSerializer — builds minimal payload for STATE_UPDATE broadcasts.
 */
export function serializeGameState(playersMap, treasureManager, timeRemaining) {
  const players = {};
  for (const [sessionId, state] of Object.entries(playersMap)) {
    players[sessionId] = state.toSnapshot();
  }

  return {
    players,
    treasure: treasureManager ? treasureManager.toSnapshot() : null,
    timeRemaining,
  };
}
