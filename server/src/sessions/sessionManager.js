import { GAME_CONFIG } from '../../../shared/gameConfig.js';

// Regular expression to validate UUID v4 format
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates if a string is a valid UUID v4.
 * @param {string} uuid
 * @returns {boolean}
 */
export function isValidUuidV4(uuid) {
  return typeof uuid === 'string' && UUID_V4_REGEX.test(uuid);
}

export class SessionManager {
  constructor() {
    // Map<sessionId, sessionObj>
    this.sessions = new Map();
    // Map<socketId, sessionId> for fast lookup
    this.socketToSession = new Map();
  }

  /**
   * Creates or restores a player session.
   * @param {string} sessionId
   * @param {string} playerName
   * @param {string} socketId
   * @returns {object|null} The session object, or null if invalid session ID
   */
  handleSessionHandshake(sessionId, playerName, socketId) {
    if (!isValidUuidV4(sessionId)) {
      return null;
    }

    // Clean player name to match 2-20 characters limit
    const cleanName = typeof playerName === 'string' 
      ? playerName.trim().substring(0, 20) 
      : 'Guest';

    let session = this.sessions.get(sessionId);

    if (session) {
      // Restore existing session
      if (session.disconnectTimeout) {
        clearTimeout(session.disconnectTimeout);
        session.disconnectTimeout = null;
      }
      
      // Update socket connection mapping
      const oldSocketId = session.socketId;
      if (oldSocketId) {
        this.socketToSession.delete(oldSocketId);
      }
      
      session.socketId = socketId;
      session.playerName = cleanName; // Update name if changed
      console.log(`[Session Restored]: ${cleanName} (${sessionId}) reconnected on socket ${socketId}`);
    } else {
      // Create new session
      session = {
        sessionId,
        playerName: cleanName,
        socketId,
        team: 'NONE',
        isReady: false,
        disconnectTimeout: null
      };
      this.sessions.set(sessionId, session);
      console.log(`[Session Created]: ${cleanName} (${sessionId}) connected on socket ${socketId}`);
    }

    this.socketToSession.set(socketId, sessionId);
    return session;
  }

  /**
   * Handles player disconnection. Starts 30s cleanup window.
   * @param {string} socketId
   * @param {function} onExpired Callback when reconnect window expires
   */
  handleDisconnect(socketId, onExpired) {
    const sessionId = this.socketToSession.get(socketId);
    if (!sessionId) return;

    this.socketToSession.delete(socketId);

    const session = this.sessions.get(sessionId);
    if (session) {
      session.socketId = null;
      console.log(`[Session Disconnected]: ${session.playerName} (${sessionId}) disconnected. Reconnect window started.`);

      session.disconnectTimeout = setTimeout(() => {
        this.sessions.delete(sessionId);
        console.log(`[Session Expired]: ${session.playerName} (${sessionId}) failed to reconnect within window.`);
        if (typeof onExpired === 'function') {
          onExpired(sessionId);
        }
      }, GAME_CONFIG.REJOIN_WINDOW_MS);
    }
  }

  /**
   * Retrieves a session by socketId.
   * @param {string} socketId
   * @returns {object|undefined}
   */
  getSessionBySocket(socketId) {
    const sessionId = this.socketToSession.get(socketId);
    return sessionId ? this.sessions.get(sessionId) : undefined;
  }

  /**
   * Retrieves a session by sessionId.
   * @param {string} sessionId
   * @returns {object|undefined}
   */
  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }
}
