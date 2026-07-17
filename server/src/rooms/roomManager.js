const { generateRoomCode, generatePlayerId, now } = require('../utils/helpers.js');
const { createRoom, wouldImbalance, findNextHost } = require('./roomState.js');
const { GAME_CONFIG, TEAM, PLAYER_COLORS } = require('../../../shared/constants.js');

function getRandomColor() {
  return PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)];
}

class RoomManager {
  constructor() {
    this.rooms = new Map();
    this.socketToRoom = new Map();
  }

  createRoom(socketId, playerName, settings = {}) {
    if (!playerName || playerName.length < 2 || playerName.length > 20) {
      return { success: false, error: 'Invalid player name' };
    }
    
    let code = null;
    for (let i = 0; i < 10; i++) {
      const candidate = generateRoomCode();
      if (!this.rooms.has(candidate)) {
        code = candidate;
        break;
      }
    }
    if (!code) {
      return { success: false, error: 'Failed to generate unique room code' };
    }

    const room = createRoom(socketId, playerName, settings);
    room.code = code;
    room.players[socketId].team = TEAM.A;

    this.rooms.set(code, room);
    this.socketToRoom.set(socketId, code);

    room.inactivityTimerId = setTimeout(() => {
      this.deleteRoom(code);
    }, GAME_CONFIG.ROOM_TIMEOUT);

    return { success: true, data: { roomCode: code, player: room.players[socketId], room } };
  }

  joinRoom(socketId, roomCode, playerName) {
    if (!playerName || playerName.length < 2 || playerName.length > 20) {
      return { success: false, error: 'Invalid player name' };
    }
    
    const code = roomCode.toUpperCase();
    const room = this.rooms.get(code);
    
    if (!room) {
      return { success: false, error: 'Room not found' };
    }
    if (room.status !== 'lobby') {
      // return { success: false, error: 'Match already in progress' };
    }
    if (Object.keys(room.players).length >= 14) {
      return { success: false, error: 'Room is full' };
    }
    if (this.socketToRoom.has(socketId)) {
      return { success: false, error: 'Already in a room' };
    }

    let teamCountA = 0;
    let teamCountB = 0;
    for (const sid in room.players) {
      if (room.players[sid].team === TEAM.A) teamCountA++;
      else if (room.players[sid].team === TEAM.B) teamCountB++;
    }
    
    const assignedTeam = teamCountA <= teamCountB ? TEAM.A : TEAM.B;
    const isSpectator = room.status !== 'lobby';

    const newPlayer = {
      id: generatePlayerId(),
      socketId,
      name: playerName,
      team: assignedTeam,
      color: getRandomColor(),
      isReady: isSpectator ? true : false,
      isHost: false,
      isConnected: true,
      disconnectedAt: null,
      position: null,
      gift: null,
      hasPickupImmunity: false,
      isAfk: false,
      afkTimerId: null,
      isSpectator
    };

    room.players[socketId] = newPlayer;
    this.socketToRoom.set(socketId, code);

    return { success: true, data: { roomCode: code, player: newPlayer, room } };
  }

  addBot(hostSocketId) {
    const code = this.socketToRoom.get(hostSocketId);
    if (!code) return { success: false, error: 'Not in a room' };
    const room = this.rooms.get(code);
    if (room.hostId !== hostSocketId) return { success: false, error: 'Only host can add bots' };
    if (Object.keys(room.players).length >= 14) return { success: false, error: 'Room is full' };

    let teamCountA = 0;
    let teamCountB = 0;
    for (const sid in room.players) {
      if (room.players[sid].team === TEAM.A) teamCountA++;
      else if (room.players[sid].team === TEAM.B) teamCountB++;
    }
    const assignedTeam = teamCountA <= teamCountB ? TEAM.A : TEAM.B;

    const botSocketId = 'bot_' + Math.random().toString(36).substring(2, 9);
    const newBot = {
      id: generatePlayerId(),
      socketId: botSocketId,
      name: 'Bot ' + Math.floor(Math.random() * 1000),
      team: assignedTeam,
      color: getRandomColor(),
      isReady: true, // Bots are always ready
      isHost: false,
      isConnected: true,
      disconnectedAt: null,
      position: null,
      gift: null,
      hasPickupImmunity: false,
      isAfk: false,
      afkTimerId: null
    };

    room.players[botSocketId] = newBot;
    return { success: true, data: { room } };
  }

  leaveRoom(socketId) {
    const code = this.socketToRoom.get(socketId);
    if (!code) return { success: false, error: 'Not in a room' };
    
    const room = this.rooms.get(code);
    if (!room) {
      this.socketToRoom.delete(socketId);
      return { success: false, error: 'Room not found' };
    }

    const player = room.players[socketId];
    if (player && player.afkTimerId) {
      clearTimeout(player.afkTimerId);
    }
    
    delete room.players[socketId];
    this.socketToRoom.delete(socketId);

    const playerIds = Object.keys(room.players);
    if (playerIds.length === 0) {
      this.deleteRoom(code);
      return { success: true, data: { roomDeleted: true, newHostId: null } };
    }

    let newHostId = null;
    if (room.hostId === socketId) {
      const migrateResult = this.migrateHost(code);
      newHostId = migrateResult.data.newHostId;
    }

    return { success: true, data: { roomDeleted: false, newHostId } };
  }

  handleDisconnect(socketId) {
    const code = this.socketToRoom.get(socketId);
    if (!code) return { success: false, error: 'Not in a room' };
    
    const room = this.rooms.get(code);
    if (!room) return { success: false, error: 'Room not found' };

    const player = room.players[socketId];
    if (player) {
      player.isConnected = false;
      player.disconnectedAt = now();
      let newHostId = null;
      if (room.hostId === socketId) {
        const migrateResult = this.migrateHost(code);
        newHostId = migrateResult.data.newHostId;
      }
      return { success: true, data: { roomCode: code, playerId: player.id, newHostId } };
    }
    return { success: false, error: 'Player not found in room' };
  }

  rejoinRoom(socketId, roomCode, playerName) {
    const code = roomCode.toUpperCase();
    const room = this.rooms.get(code);
    if (!room) return { success: false, error: 'Room not found' };

    for (const oldSocketId in room.players) {
      const p = room.players[oldSocketId];
      if (!p.isConnected && p.name === playerName) {
        if (now() - p.disconnectedAt <= GAME_CONFIG.REJOIN_WINDOW) {
          p.isConnected = true;
          p.disconnectedAt = null;
          p.socketId = socketId;
          
          room.players[socketId] = p;
          delete room.players[oldSocketId];
          
          this.socketToRoom.delete(oldSocketId);
          this.socketToRoom.set(socketId, code);

          if (room.hostId === oldSocketId) {
            room.hostId = socketId;
          }

          return { success: true, data: { roomCode: code, player: p, room } };
        }
      }
    }
    return { success: false, error: 'Rejoin window expired or player not found' };
  }

  switchTeam(socketId, team) {
    const code = this.socketToRoom.get(socketId);
    if (!code) return { success: false, error: 'Not in a room' };
    const room = this.rooms.get(code);
    if (room.status !== 'lobby') return { success: false, error: 'Cannot switch teams during match' };
    
    const player = room.players[socketId];
    if (player.team === team) return { success: true, data: { room } };

    if (wouldImbalance(room, team, socketId)) {
      return { success: false, error: 'Team change would cause imbalance' };
    }

    player.team = team;
    return { success: true, data: { room } };
  }

  changeColor(socketId, color) {
    const code = this.socketToRoom.get(socketId);
    if (!code) return { success: false, error: 'Not in a room' };
    const room = this.rooms.get(code);
    if (room.status !== 'lobby') return { success: false, error: 'Cannot change color now' };
    
    if (!PLAYER_COLORS.includes(color)) return { success: false, error: 'Invalid color' };

    room.players[socketId].color = color;
    return { success: true, data: { room } };
  }

  changeMazeType(socketId, type) {
    const code = this.socketToRoom.get(socketId);
    if (!code) return { success: false, error: 'Not in a room' };
    const room = this.rooms.get(code);
    if (room.hostId !== socketId) return { success: false, error: 'Only host can change maze type' };
    if (room.status !== 'lobby') return { success: false, error: 'Cannot change settings now' };
    
    room.settings.mazeType = type;
    return { success: true, data: { room } };
  }

  toggleReady(socketId) {
    const code = this.socketToRoom.get(socketId);
    if (!code) return { success: false, error: 'Not in a room' };
    const room = this.rooms.get(code);
    if (room.status !== 'lobby') return { success: false, error: 'Cannot toggle ready during match' };

    room.players[socketId].isReady = !room.players[socketId].isReady;
    return { success: true, data: { room } };
  }

  startGame(socketId) {
    const code = this.socketToRoom.get(socketId);
    if (!code) return { success: false, error: 'Not in a room' };
    const room = this.rooms.get(code);
    
    if (room.hostId !== socketId) return { success: false, error: 'Only host can start game' };
    if (room.status !== 'lobby') return { success: false, error: 'Match already in progress' };
    
    const playerIds = Object.keys(room.players);
    if (playerIds.length < 2) return { success: false, error: 'Need at least 2 players' };
    
    const allReady = playerIds.every(id => room.players[id].isReady);
    if (!allReady) return { success: false, error: 'Not all players are ready' };

    room.status = 'starting';
    return { success: true, data: { roomCode: code } };
  }

  returnToLobby(socketId) {
    const code = this.socketToRoom.get(socketId);
    if (!code) return { success: false, error: 'Not in a room' };
    const room = this.rooms.get(code);
    
    if (room.hostId !== socketId) return { success: false, error: 'Only host can return to lobby' };
    
    room.status = 'lobby';
    delete room.match;
    
    for (const sid in room.players) {
      const p = room.players[sid];
      if (p.isHost) {
         p.isReady = true;
      } else if (!sid.startsWith('bot_')) {
         p.isReady = false;
      }
      p.position = null;
      p.gift = null;
      p.hasPickupImmunity = false;
      p.activeEffects = {};
      p.activeGift = null;
    }
    
    return { success: true, data: { roomCode: code, room } };
  }

  migrateHost(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room) return { success: false, error: 'Room not found' };

    const nextHostId = findNextHost(room);
    if (nextHostId) {
      room.hostId = nextHostId;
      room.players[nextHostId].isHost = true;
      room.players[nextHostId].isReady = true;
      if (room.players[room.hostId] && room.hostId !== nextHostId) {
         room.players[room.hostId].isHost = false; 
      }
      return { success: true, data: { newHostId: nextHostId } };
    }
    return { success: true, data: { newHostId: null } }; 
  }

  kickPlayer(hostSocketId, targetSocketId) {
    const code = this.socketToRoom.get(hostSocketId);
    if (!code) return { success: false, error: 'Not in a room' };
    const room = this.rooms.get(code);
    if (room.hostId !== hostSocketId) return { success: false, error: 'Only host can kick' };
    if (hostSocketId === targetSocketId) return { success: false, error: 'Cannot kick yourself' };
    
    const targetPlayer = room.players[targetSocketId];
    if (!targetPlayer) return { success: false, error: 'Player not found in room' };

    const leaveRes = this.leaveRoom(targetSocketId);
    return leaveRes;
  }

  deleteRoom(roomCode) {
    const room = this.rooms.get(roomCode);
    if (room) {
      if (room.inactivityTimerId) clearTimeout(room.inactivityTimerId);
      for (const sid in room.players) {
        const p = room.players[sid];
        if (p.afkTimerId) clearTimeout(p.afkTimerId);
        this.socketToRoom.delete(sid);
      }
      this.rooms.delete(roomCode);
      return { success: true };
    }
    return { success: false, error: 'Room not found' };
  }

  getRoomBySocket(socketId) {
    const code = this.socketToRoom.get(socketId);
    return code ? this.rooms.get(code) : null;
  }

  getRoomByCode(code) {
    return this.rooms.get(code);
  }

  getStats() {
    let playersCount = 0;
    this.rooms.forEach(room => {
      playersCount += Object.keys(room.players).length;
    });
    return {
      rooms: this.rooms.size,
      players: playersCount
    };
  }
}

module.exports = { RoomManager };
