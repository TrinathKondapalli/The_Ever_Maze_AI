// ─────────────────────────────────────────
// Socket.io Events — Single Source of Truth
// ─────────────────────────────────────────
export const EVENTS = Object.freeze({
  // Auth / Session
  AUTH_HANDSHAKE: 'AUTH_HANDSHAKE',
  AUTH_SUCCESS: 'AUTH_SUCCESS',
  AUTH_FAIL: 'AUTH_FAIL',

  // Room Lifecycle
  CREATE_ROOM: 'CREATE_ROOM',
  JOIN_ROOM: 'JOIN_ROOM',
  LEAVE_ROOM: 'LEAVE_ROOM',
  ROOM_UPDATE: 'ROOM_UPDATE',
  ROOM_ERROR: 'ROOM_ERROR',

  // Lobby Actions
  SWITCH_TEAM: 'SWITCH_TEAM',
  TOGGLE_READY: 'TOGGLE_READY',
  KICK_PLAYER: 'KICK_PLAYER',
  START_GAME: 'START_GAME',

  // Matchmaking
  QUEUE_JOIN: 'QUEUE_JOIN',
  QUEUE_LEAVE: 'QUEUE_LEAVE',
  QUEUE_UPDATE: 'QUEUE_UPDATE',
  MATCH_FOUND: 'MATCH_FOUND',

  // Game Lifecycle
  MATCH_START: 'MATCH_START',
  PHASE_CHANGE: 'PHASE_CHANGE',
  MATCH_WIN: 'MATCH_WIN',
  MATCH_DRAW: 'MATCH_DRAW',

  // Player State
  PLAYER_MOVE: 'PLAYER_MOVE',
  PLAYER_ATTACK: 'PLAYER_ATTACK',
  PLAYER_ELIMINATED: 'PLAYER_ELIMINATED',
  PLAYER_RESPAWNED: 'PLAYER_RESPAWNED',

  // Treasure
  TREASURE_PICKUP: 'TREASURE_PICKUP',
  TREASURE_FOUND: 'TREASURE_FOUND',
  TREASURE_DROPPED: 'TREASURE_DROPPED',
  TREASURE_STOLEN: 'TREASURE_STOLEN',

  // Exit
  EXIT_ATTEMPT: 'EXIT_ATTEMPT',

  // Server State Sync
  STATE_UPDATE: 'STATE_UPDATE',

  // Chat
  CHAT_MESSAGE: 'CHAT_MESSAGE',
});

// ─────────────────────────────────────────
// Enums
// ─────────────────────────────────────────

export const TEAM = Object.freeze({
  A: 'A',
  B: 'B',
  NONE: 'NONE',
});

export const MATCH_STATE = Object.freeze({
  ROOM_LOBBY:      'ROOM_LOBBY',
  COUNTDOWN:       'COUNTDOWN',
  MAP_LOADING:     'MAP_LOADING',
  SEARCHING:       'SEARCHING',
  TREASURE_FOUND:  'TREASURE_FOUND',
  CHASE:           'CHASE',
  STOLEN:          'STOLEN',
  VICTORY:         'VICTORY',
  DRAW:            'DRAW',
  POST_MATCH:      'POST_MATCH',
});

export const TREASURE_STATE = Object.freeze({
  HIDDEN:     'HIDDEN',
  ON_GROUND:  'ON_GROUND',
  CARRIED_A:  'CARRIED_A',
  CARRIED_B:  'CARRIED_B',
  DROPPED:    'DROPPED',
});

export const CHUNK_TYPE = Object.freeze({
  OPEN:         'OPEN',
  BLOCKED:      'BLOCKED',
  SPAWN_A:      'SPAWN_A',
  SPAWN_B:      'SPAWN_B',
  TREASURE_ZONE:'TREASURE_ZONE',
  EXIT:         'EXIT',
  LANDMARK:     'LANDMARK',
});

export const BIOME_TYPE = Object.freeze({
  FOREST:       'FOREST',
  RUINS:        'RUINS',
  CRYSTAL_CAVES:'CRYSTAL_CAVES',
});

export const UI_SCREEN = Object.freeze({
  LANDING: 'LANDING',
  LOBBY:   'LOBBY',
  GAME:    'GAME',
});
