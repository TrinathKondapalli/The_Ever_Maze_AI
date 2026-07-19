import { GAME_CONFIG } from '../../../shared/gameConfig.js';
import { EVENTS, MATCH_STATE } from '../../../shared/constants.js';
import { serializeGameState } from './stateSerializer.js';

export class GameLoop {
  constructor(room, io) {
    this.room = room;
    this.io = io;
    this.intervalId = null;
    
    // Match timer (seconds)
    this.timeRemaining = GAME_CONFIG.MATCH_TIMER_SECONDS;
    this.lastTickTime = Date.now();
  }

  start() {
    if (this.intervalId) return;
    this.lastTickTime = Date.now();
    this.intervalId = setInterval(() => this.tick(), GAME_CONFIG.TICK_MS);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  tick() {
    const now = Date.now();
    const dt = (now - this.lastTickTime) / 1000;
    this.lastTickTime = now;

    // 1. Process player inputs
    for (const [sessionId, playerState] of Object.entries(this.room.playerStates)) {
      this.processPlayerInputs(playerState, dt);
    }

    // 2. Update match timer
    this.updateTimer(dt);

    // 3. Broadcast STATE_UPDATE
    if (this.room.matchState !== MATCH_STATE.POST_MATCH && this.room.matchState !== MATCH_STATE.VICTORY && this.room.matchState !== MATCH_STATE.DRAW) {
      const payload = serializeGameState(this.room.playerStates, this.room.treasure, this.timeRemaining);
      this.io.to(this.room.code).emit(EVENTS.STATE_UPDATE, payload);
    }
  }

  processPlayerInputs(playerState, tickDt) {
    // Basic server-side movement processing (Server authoratative)
    // For Module 10, we'll blindly accept client positions from the input packet
    // to establish the reconciliation loop, but we process them in sequence.
    // In a full implementation, we'd do server-side collision here.

    while (playerState.inputQueue.length > 0) {
      const input = playerState.inputQueue.shift();
      
      // Update state to match client's simulated position for now
      // This ensures the server tracks where the client says it is
      // A robust anti-cheat would calculate this using `input.forward`, `input.yaw`, etc. and collision.
      if (input.x !== undefined && input.z !== undefined) {
         playerState.x = input.x;
         playerState.y = input.y !== undefined ? input.y : 0;
         playerState.z = input.z;
         playerState.yaw = input.yaw;
      }
      
      playerState.lastProcessedSeq = input.seq;
    }
  }

  updateTimer(dt) {
    // Only tick down if game is actively being played
    if (this.room.matchState === MATCH_STATE.MAP_LOADING || 
        this.room.matchState === MATCH_STATE.COUNTDOWN ||
        this.room.matchState === MATCH_STATE.ROOM_LOBBY) {
        return; 
    }
    
    if (this.room.matchState === MATCH_STATE.VICTORY || this.room.matchState === MATCH_STATE.DRAW) {
        return;
    }

    this.timeRemaining -= dt;

    if (this.timeRemaining <= 0) {
      this.timeRemaining = 0;
      this.room.matchState = MATCH_STATE.DRAW;
      this.io.to(this.room.code).emit(EVENTS.MATCH_DRAW, { reason: 'timeout' });
      this.stop();
    }
  }
}
