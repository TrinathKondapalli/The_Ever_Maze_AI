const { generatePlayerId } = require('../utils/helpers.js');

function createRoom(hostSocketId, hostName, hostColor, settings = {}) {
  return {
    code: null, // Assigned later
    createdAt: Date.now(),
    hostId: hostSocketId,
    players: {
      [hostSocketId]: {
        id: generatePlayerId(),
        socketId: hostSocketId,
        name: hostName,
        team: null,
        color: hostColor || '#06b6d4', // Use chosen color, default to Cyan
        isReady: false,
        isHost: true,
        isConnected: true,
        disconnectedAt: null,
        position: null,
        gift: null,
        hasPickupImmunity: false,
        isAfk: false,
        afkTimerId: null,
        isSpectator: false
      }
    },
    settings: {
      matchDuration: settings.matchDuration || 300000,
      mazeSize: settings.mazeSize || 31,
      mazeType: settings.mazeType || 'STANDARD',
      giftFrequency: settings.giftFrequency || 60000,
      wallShifts: settings.wallShifts !== undefined ? settings.wallShifts : 3
    },
    match: null,
    status: 'lobby',
    inactivityTimerId: null
  };
}

function getTeamCount(room, team) {
  let count = 0;
  for (const socketId in room.players) {
    if (room.players[socketId].team === team) {
      count++;
    }
  }
  return count;
}

function wouldImbalance(room, targetTeam, socketId) {
  const currentTeam = socketId ? room.players[socketId]?.team : null;
  let targetTeamCount = getTeamCount(room, targetTeam);
  let otherTeamCount = getTeamCount(room, targetTeam === 'A' ? 'B' : 'A');

  if (currentTeam === targetTeam) return false;

  targetTeamCount += 1;
  if (currentTeam) {
    otherTeamCount -= 1;
  }

  return (targetTeamCount - otherTeamCount) >= 2;
}

function allPlayersReady(room) {
  const playerIds = Object.keys(room.players);
  if (playerIds.length === 0) return false;
  return playerIds.every(socketId => room.players[socketId].isReady);
}

function getConnectedPlayers(room) {
  return Object.values(room.players).filter(p => p.isConnected);
}

function hasValidHost(room) {
  const host = room.players[room.hostId];
  return host && host.isConnected;
}

function findNextHost(room) {
  for (const socketId in room.players) {
    if (room.players[socketId].isConnected && socketId !== room.hostId) {
      return socketId;
    }
  }
  return null;
}

module.exports = {
  createRoom,
  getTeamCount,
  wouldImbalance,
  allPlayersReady,
  getConnectedPlayers,
  hasValidHost,
  findNextHost
};
