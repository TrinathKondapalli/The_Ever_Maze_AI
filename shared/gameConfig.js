// ─────────────────────────────────────────────────────────────────
// Lumina Game Config — Single Source of Truth for ALL numeric values
// No magic numbers anywhere else in the codebase.
// ─────────────────────────────────────────────────────────────────
export const GAME_CONFIG = Object.freeze({
  // ── Server ──────────────────────────────
  TICK_RATE: 20,                     // game loop ticks per second
  TICK_MS: 50,                       // ms per tick (1000 / TICK_RATE)

  // ── Room ────────────────────────────────
  MAX_PLAYERS: 14,                   // 7 per team
  MAX_PLAYERS_PER_TEAM: 7,
  MIN_PLAYERS: 4,                    // 2 per team to start
  MIN_PLAYERS_PER_TEAM: 2,
  ROOM_CODE_LENGTH: 6,
  ROOM_TIMEOUT_MS: 7_200_000,        // 2 hours inactivity
  REMATCH_TIMEOUT_MS: 60_000,        // auto-leave post-match

  // ── Reconnect ───────────────────────────
  REJOIN_WINDOW_MS: 30_000,          // 30 seconds to reconnect

  // ── Countdown ───────────────────────────
  COUNTDOWN_SECONDS: 3,

  // ── Match Timer ─────────────────────────
  MATCH_TIMER_SECONDS: 180,          // 3 minutes

  // ── Player Movement ─────────────────────
  PLAYER_WALK_SPEED: 3.0,            // m/s
  PLAYER_RUN_SPEED: 5.5,             // m/s
  CARRIER_WALK_SPEED: 2.4,           // 80% of walk
  CARRIER_RUN_SPEED: 4.4,            // 80% of run
  JUMP_HEIGHT: 1.2,                  // meters
  PLAYER_HEIGHT: 1.8,                // meters
  EYE_HEIGHT: 1.7,                   // meters (first-person camera)

  // ── Combat ──────────────────────────────
  ATTACK_RANGE: 1.5,                 // meters
  ATTACK_CONE_DEGREES: 60,
  ATTACK_COOLDOWN_MS: 800,           // 0.8 seconds
  PLAYER_MAX_HEALTH: 3,              // hits to eliminate
  RESPAWN_DELAY_MS: 5_000,           // 5 seconds
  CARRIER_PICKUP_IMMUNITY_MS: 2_000, // 2 second immunity on pickup

  // ── Treasure ────────────────────────────
  TREASURE_PICKUP_RADIUS: 2.0,       // meters
  TREASURE_DROP_PICKUP_DELAY_MS: 500, // delay before ground pickup enabled
  TREASURE_FLOAT_HEIGHT: 0.8,        // meters above ground
  TREASURE_GLOW_RADIUS: 8.0,         // point light radius

  // ── Exit Door ───────────────────────────
  EXIT_TRIGGER_RADIUS: 1.5,          // meters
  EXIT_VISIBLE_RANGE: 20.0,          // meters

  // ── Map ─────────────────────────────────
  MAP_GRID_SIZE: 24,                 // 24x24 chunks
  CHUNK_SIZE: 16,                    // 16 meters per chunk
  OBSTACLE_PERCENT_MIN: 0.20,
  OBSTACLE_PERCENT_MAX: 0.35,
  MAP_GEN_MAX_RETRIES: 3,
  FALLBACK_MAP_COUNT: 10,
  MAP_GEN_TIMEOUT_MS: 500,           // must complete under 500ms
  MAP_JSON_MAX_KB: 100,

  // ── Camera ──────────────────────────────
  FOV_DEFAULT: 75,                   // degrees
  FOV_MIN: 60,
  FOV_MAX: 90,
  FOV_SPRINT_BOOST: 5,               // degrees added while sprinting
  CAMERA_SENSITIVITY_DEFAULT: 0.3,
  TP_CAMERA_DISTANCE: 4.0,           // meters behind player
  TP_CAMERA_HEIGHT: 1.5,             // meters above player
  TP_CAMERA_TOGGLE_LERP_MS: 400,     // smooth FP/TP transition duration
  TP_AUTOZOOM_MIN_CLEARANCE: 2.0,    // meters

  // ── Networking ──────────────────────────
  INTERPOLATION_BUFFER_MS: 100,      // 2 server ticks
  PREDICTION_RECONCILE_THRESHOLD: 0.1, // meters before snap
  PREDICTION_RECONCILE_LERP_MS: 200,
  LAG_COMPENSATION_MAX_MS: 200,
  MAX_PACKET_SIZE_KB: 4,
  EVENTS_PER_SECOND_PER_PLAYER: 60,  // rate limit

  // ── Minimap ─────────────────────────────
  MINIMAP_SIZE_DESKTOP: 80,          // px
  MINIMAP_SIZE_MOBILE: 60,           // px

  // ── Timer Thresholds ────────────────────
  TIMER_YELLOW_THRESHOLD: 60,        // seconds
  TIMER_ORANGE_THRESHOLD: 30,
  TIMER_RED_THRESHOLD: 10,
  TIMER_BEEP_INTERVAL_HIGH: 5,       // every 5s below 30s
  TIMER_BEEP_INTERVAL_LOW: 1,        // every 1s below 10s

  // ── Audio ────────────────────────────────
  MUSIC_CROSSFADE_TREASURE_MS: 1000,
  MUSIC_CROSSFADE_STEAL_MS: 500,

  // ── Carrier Visibility ──────────────────
  CARRIER_GLOW_VISIBLE_RANGE: 30,    // meters
  TEAMMATE_NAMETAG_RANGE: 15,        // meters beyond which nametag shown
  TREASURE_DISCOVERY_RANGE: 30,      // meters (always rendered)

  // ── Performance ─────────────────────────
  MAX_DRAW_CALLS: 80,
  LOD_LEVELS: 3,
  MOBILE_CPU_CORE_THRESHOLD: 4,      // below this: reduce particle count
  PARTICLES_FULL: 150,
  PARTICLES_REDUCED: 30,
});
