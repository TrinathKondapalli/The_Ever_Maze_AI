const { v4: uuidv4 } = require('uuid');

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generatePlayerId() {
  return uuidv4();
}

function now() {
  return Date.now();
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function tileDistance(posA, posB) {
  if (!posA || !posB) return Infinity;
  const dx = posA.x - posB.x;
  const dy = posA.y - posB.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function withinRadius(posA, posB, radius) {
  return tileDistance(posA, posB) <= radius;
}

function sanitizePlayer(player) {
  if (!player) return null;
  const { socketId, afkTimerId, ...safePlayer } = player;
  return safePlayer;
}

function sanitizeRoomForBroadcast(room) {
  if (!room) return null;
  const safePlayers = {};
  for (const socketId in room.players) {
    safePlayers[socketId] = sanitizePlayer(room.players[socketId]);
  }
  const { inactivityTimerId, ...safeRoom } = room;
  return {
    ...safeRoom,
    players: safePlayers
  };
}

module.exports = {
  generateRoomCode,
  generatePlayerId,
  now,
  clamp,
  tileDistance,
  withinRadius,
  sanitizePlayer,
  sanitizeRoomForBroadcast
};
