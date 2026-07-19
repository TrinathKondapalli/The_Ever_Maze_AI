import { EVENTS, TEAM, MATCH_STATE } from '../../../shared/constants.js';
import { GAME_CONFIG } from '../../../shared/gameConfig.js';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ123456789'; // Excludes 0, O, I, l

function generateRoomCode() {
  let code = '';
  for (let i = 0; i < GAME_CONFIG.ROOM_CODE_LENGTH; i++) {
    code += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
  }
  return code;
}

export class RoomManager {
  constructor() {
    // Map<roomCode, roomObj>
    this.rooms = new Map();
    // Map<sessionId, roomCode> for fast lookup of player's current room
    this.playerToRoom = new Map();
  }

  getRoomCount() {
    return this.rooms.size;
  }

  getPlayerCount() {
    return this.playerToRoom.size;
  }

  /**
   * Helper to fetch a room by code.
   * @param {string} code 
   */
  getRoom(code) {
    return this.rooms.get(code?.toUpperCase());
  }

  /**
   * Helper to retrieve room by player session ID.
   * @param {string} sessionId 
   */
  getRoomByPlayer(sessionId) {
    const code = this.playerToRoom.get(sessionId);
    return code ? this.rooms.get(code) : null;
  }

  /**
   * Creates a new game room.
   * @param {object} playerSession The session object of the host player
   * @returns {object} The created room object
   */
  createRoom(playerSession) {
    let code = '';
    let retries = 0;
    // Generate a unique room code
    do {
      code = generateRoomCode();
      retries++;
    } while (this.rooms.has(code) && retries < 10);
    const room = {
      code,
      hostSessionId: playerSession.sessionId,
      matchState: MATCH_STATE.ROOM_LOBBY,
      players: {},
      playerStates: {},
      gameLoop: null,
      chatMessages: [],
      createdAt: Date.now()
    };

    this.rooms.set(code, room);
    return this.joinRoom(code, playerSession);
  }

  /**
   * Adds a player to a room.
   * @param {string} code 
   * @param {object} playerSession 
   * @returns {object} Updated room object, or throws error if invalid
   */
  joinRoom(code, playerSession) {
    const uppercaseCode = code?.toUpperCase();
    const room = this.rooms.get(uppercaseCode);

    if (!room) {
      throw new Error('Room not found.');
    }

    if (room.matchState !== MATCH_STATE.ROOM_LOBBY) {
      throw new Error('Match is already in progress.');
    }

    const playerList = Object.values(room.players);
    if (playerList.length >= GAME_CONFIG.MAX_PLAYERS) {
      throw new Error('Room is full.');
    }

    // Leave any previous room
    this.leaveRoom(playerSession.sessionId);

    // Initial assignment
    const isHost = room.hostSessionId === playerSession.sessionId;
    
    room.players[playerSession.sessionId] = {
      sessionId: playerSession.sessionId,
      name: playerSession.playerName,
      socketId: playerSession.socketId,
      team: TEAM.NONE,
      isReady: false,
      isHost
    };

    this.playerToRoom.set(playerSession.sessionId, uppercaseCode);
    console.log(`[Room Manager] ${playerSession.playerName} joined room ${uppercaseCode}`);

    return room;
  }

  /**
   * Removes a player from their current room. Handles room deletion and host migration.
   * @param {string} sessionId 
   * @returns {object|null} The room that was left (or null if they weren't in one)
   */
  leaveRoom(sessionId) {
    const code = this.playerToRoom.get(sessionId);
    if (!code) return null;

    const room = this.rooms.get(code);
    if (!room) return null;

    const player = room.players[sessionId];
    delete room.players[sessionId];
    this.playerToRoom.delete(sessionId);

    console.log(`[Room Manager] ${player?.name || 'Player'} left room ${code}`);

    const remainingPlayers = Object.values(room.players);

    if (remainingPlayers.length === 0) {
      // Delete room if empty
      this.deleteRoom(code);
      return null;
    }

    // If the leaving player was the host, migrate the host role
    if (room.hostSessionId === sessionId) {
      this.migrateHost(code);
    }

    return room;
  }

  /**
   * Switches a player's team, enforcing server-side team balancing rules.
   * @param {string} sessionId 
   * @param {string} targetTeam 'A' or 'B'
   * @returns {object} Updated room object
   */
  switchTeam(sessionId, targetTeam) {
    const room = this.getRoomByPlayer(sessionId);
    if (!room) throw new Error('Not in a room.');

    if (room.matchState !== MATCH_STATE.ROOM_LOBBY) {
      throw new Error('Cannot switch teams after game starts.');
    }

    if (targetTeam !== TEAM.A && targetTeam !== TEAM.B) {
      throw new Error('Invalid team selection.');
    }

    const player = room.players[sessionId];
    if (!player) throw new Error('Player not found in room.');

    // Count team sizes
    const players = Object.values(room.players);
    const countA = players.filter(p => p.team === TEAM.A).length;
    const countB = players.filter(p => p.team === TEAM.B).length;

    const currentTeam = player.team;

    // Check balance validation:
    // If switching to A, size of A will increase by 1, B might decrease by 1 (if they were on B).
    // The GDD says: "no team can have > 1 player difference"
    let newCountA = countA;
    let newCountB = countB;

    if (currentTeam === TEAM.A) newCountA--;
    if (currentTeam === TEAM.B) newCountB--;

    if (targetTeam === TEAM.A) newCountA++;
    if (targetTeam === TEAM.B) newCountB++;

    const diff = Math.abs(newCountA - newCountB);
    if (diff > 1) {
      throw new Error('Team switch would unbalance the match.');
    }

    player.team = targetTeam;
    console.log(`[Room Manager] ${player.name} switched to Team ${targetTeam}`);
    return room;
  }

  /**
   * Toggles a player's ready state.
   * @param {string} sessionId 
   * @returns {object} Updated room object
   */
  toggleReady(sessionId) {
    const room = this.getRoomByPlayer(sessionId);
    if (!room) throw new Error('Not in a room.');

    const player = room.players[sessionId];
    if (!player) throw new Error('Player not found.');

    player.isReady = !player.isReady;
    return room;
  }

  /**
   * Kicks a player from the room (Host only).
   * @param {string} hostSessionId The session ID of the host attempting the kick
   * @param {string} targetSessionId The player to be kicked
   * @returns {object} Updated room object
   */
  kickPlayer(hostSessionId, targetSessionId) {
    const room = this.getRoomByPlayer(hostSessionId);
    if (!room) throw new Error('Not in a room.');

    if (room.hostSessionId !== hostSessionId) {
      throw new Error('Only the host can kick players.');
    }

    if (hostSessionId === targetSessionId) {
      throw new Error('Cannot kick yourself.');
    }

    const kickedPlayer = room.players[targetSessionId];
    if (!kickedPlayer) throw new Error('Target player not found.');

    this.leaveRoom(targetSessionId);
    return { room, kickedSocketId: kickedPlayer.socketId };
  }

  /**
   * Migrates the host role to the next connected player.
   * @param {string} code 
   */
  migrateHost(code) {
    const room = this.rooms.get(code);
    if (!room) return;

    const players = Object.values(room.players);
    if (players.length > 0) {
      // Pick the first remaining player
      const newHost = players[0];
      room.hostSessionId = newHost.sessionId;
      newHost.isHost = true;
      console.log(`[Room Manager] Host migrated to ${newHost.name} in room ${code}`);
    }
  }

  /**
   * Triggers match starting validation and countdown.
   * @param {string} hostSessionId 
   * @returns {object} Updated room object
   */
  startGame(hostSessionId) {
    const room = this.getRoomByPlayer(hostSessionId);
    if (!room) throw new Error('Not in a room.');

    if (room.hostSessionId !== hostSessionId) {
      throw new Error('Only the host can start the game.');
    }

    const players = Object.values(room.players);

    // Validate min player count (Temporarily bypassed for testing)
    /*
    if (players.length < GAME_CONFIG.MIN_PLAYERS) {
      throw new Error(`Minimum ${GAME_CONFIG.MIN_PLAYERS} players required to start.`);
    }

    const countA = players.filter(p => p.team === TEAM.A).length;
    const countB = players.filter(p => p.team === TEAM.B).length;

    if (countA < GAME_CONFIG.MIN_PLAYERS_PER_TEAM || countB < GAME_CONFIG.MIN_PLAYERS_PER_TEAM) {
      throw new Error(`Each team must have at least ${GAME_CONFIG.MIN_PLAYERS_PER_TEAM} players.`);
    }

    // Verify all players are ready
    const allReady = players.every(p => p.isHost || p.isReady);
    if (!allReady) {
      throw new Error('Waiting for all players to be ready.');
    }
    */

    room.matchState = MATCH_STATE.COUNTDOWN;
    return room;
  }

  /**
   * Deletes a room.
   * @param {string} code 
   */
  deleteRoom(code) {
    const uppercaseCode = code?.toUpperCase();
    const room = this.rooms.get(uppercaseCode);
    if (room) {
      // Clean up mapping
      Object.keys(room.players).forEach(sid => this.playerToRoom.delete(sid));
      this.rooms.delete(uppercaseCode);
      console.log(`[Room Manager] Deleted room ${uppercaseCode}`);
    }
  }

  /**
   * Appends a chat message to a room's history.
   * @param {string} sessionId 
   * @param {string} text 
   * @returns {object} { room, message }
   */
  addChatMessage(sessionId, text) {
    const room = this.getRoomByPlayer(sessionId);
    if (!room) throw new Error('Not in a room.');

    const player = room.players[sessionId];
    if (!player) throw new Error('Player not found.');

    const cleanText = text.substring(0, 140).trim();
    if (!cleanText) throw new Error('Empty message.');

    const message = {
      senderId: sessionId,
      senderName: player.name,
      senderTeam: player.team,
      text: cleanText,
      timestamp: Date.now()
    };

    room.chatMessages.push(message);
    if (room.chatMessages.length > 50) {
      room.chatMessages.shift(); // Keep last 50
    }

    return { room, message };
  }
}
