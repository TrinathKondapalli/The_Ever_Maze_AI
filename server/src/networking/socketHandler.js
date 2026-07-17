const { EVENTS, PHASE } = require('../../../shared/constants.js');
const { sanitizeRoomForBroadcast, sanitizePlayer } = require('../utils/helpers.js');
const { startGameLoop } = require('../game/gameLoop.js');

function broadcastSystemMessage(io, roomCode, text) {
  io.to(roomCode).emit(EVENTS.CHAT_MESSAGE_RECEIVED, {
    id: `sys_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    senderId: 'system',
    senderName: 'System',
    senderTeam: null,
    text,
    timestamp: Date.now(),
    isSystem: true
  });
}

function registerHandlers(io, roomManager) {
  startGameLoop(io, roomManager);

  io.on('connection', (socket) => {
    if (process.env.DEBUG === 'true') {
      console.log(`[Socket Connected]: ${socket.id}`);
    }

    socket.on('ping_request', () => {
      socket.emit('pong_response', { time: Date.now() });
    });

    socket.on(EVENTS.CREATE_ROOM, (data, callback) => {
      try {
        const { playerName, settings, profileId } = data;
        if (!playerName || playerName.length < 2) {
          throw new Error('Name must be at least 2 characters');
        }
        
        const result = roomManager.createRoom(socket.id, playerName, settings);
        if (result.success) {
          socket.join(result.data.roomCode);
          if (profileId) {
             const profiles = require('../data/profiles.js');
             profiles.updateProfileName(profileId, playerName);
             roomManager.rooms.get(result.data.roomCode).players[socket.id].profileId = profileId;
          }
          if (typeof callback === 'function') {
            callback({
              success: true,
              roomCode: result.data.roomCode,
              room: sanitizeRoomForBroadcast(result.data.room),
              player: result.data.room.players[socket.id]
            });
          }
        } else {
          if (typeof callback === 'function') callback({ success: false, error: result.error });
        }
      } catch (err) {
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    socket.on(EVENTS.JOIN_ROOM, (data, callback) => {
      try {
        const { roomCode, playerName, profileId } = data;
        const result = roomManager.joinRoom(socket.id, roomCode, playerName);
        if (result.success) {
          socket.join(result.data.roomCode);
          
          if (profileId) {
             const profiles = require('../data/profiles.js');
             profiles.updateProfileName(profileId, playerName);
             roomManager.rooms.get(result.data.roomCode).players[socket.id].profileId = profileId;
          }

          if (typeof callback === 'function') {
            callback({ 
              success: true, 
              roomCode: result.data.roomCode, 
              player: sanitizePlayer(result.data.player), 
              room: sanitizeRoomForBroadcast(result.data.room) 
            });
          }
          socket.to(result.data.roomCode).emit(EVENTS.PLAYER_JOINED, { 
            player: sanitizePlayer(result.data.player),
            room: sanitizeRoomForBroadcast(result.data.room)
          });
          broadcastSystemMessage(io, result.data.roomCode, `${playerName} has joined the room.`);
        } else {
          if (typeof callback === 'function') callback({ success: false, error: result.error });
        }
      } catch (err) {
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    socket.on(EVENTS.GET_PROFILE, (data, callback) => {
      try {
        const profiles = require('../data/profiles.js');
        const p = profiles.getProfile(data.profileId);
        if (typeof callback === 'function') callback({ success: true, profile: p });
      } catch (err) {
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    socket.on(EVENTS.LEAVE_ROOM, (data, callback) => {
      try {
        const roomCode = roomManager.socketToRoom.get(socket.id);
        const result = roomManager.leaveRoom(socket.id);
        if (result.success) {
          socket.leave(roomCode);
          if (typeof callback === 'function') callback({ success: true });
          if (!result.data.roomDeleted) {
            const room = roomManager.getRoomByCode(roomCode);
            io.to(roomCode).emit(EVENTS.PLAYER_LEFT, { 
              playerId: socket.id, 
              newHostId: result.data.newHostId,
              room: sanitizeRoomForBroadcast(room)
            });
          }
        } else {
          if (typeof callback === 'function') callback({ success: false, error: result.error });
        }
      } catch (err) {
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    socket.on(EVENTS.PLAYER_READY, (data, callback) => {
      try {
        const result = roomManager.toggleReady(socket.id);
        if (result.success) {
          if (typeof callback === 'function') callback({ success: true });
          const roomCode = roomManager.socketToRoom.get(socket.id);
          io.to(roomCode).emit(EVENTS.ROOM_UPDATE, { room: sanitizeRoomForBroadcast(result.data.room) });
        } else {
          if (typeof callback === 'function') callback({ success: false, error: result.error });
        }
      } catch (err) {
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    socket.on(EVENTS.SWITCH_TEAM, (data, callback) => {
      try {
        const result = roomManager.switchTeam(socket.id, data.team);
        if (result.success) {
          if (typeof callback === 'function') callback({ success: true });
          const roomCode = roomManager.socketToRoom.get(socket.id);
          io.to(roomCode).emit(EVENTS.ROOM_UPDATE, { room: sanitizeRoomForBroadcast(result.data.room) });
        } else {
          if (typeof callback === 'function') callback({ success: false, error: result.error });
        }
      } catch (err) {
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    socket.on(EVENTS.CHANGE_COLOR, (data, callback) => {
      try {
        const result = roomManager.changeColor(socket.id, data.color);
        if (result.success) {
          if (typeof callback === 'function') callback({ success: true });
          const roomCode = roomManager.socketToRoom.get(socket.id);
          io.to(roomCode).emit(EVENTS.ROOM_UPDATE, { room: sanitizeRoomForBroadcast(result.data.room) });
        } else {
          if (typeof callback === 'function') callback({ success: false, error: result.error });
        }
      } catch (err) {
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    socket.on(EVENTS.CHANGE_MAZE_TYPE, (data, callback) => {
      try {
        const result = roomManager.changeMazeType(socket.id, data.type);
        if (result.success) {
          if (typeof callback === 'function') callback({ success: true });
          const roomCode = roomManager.socketToRoom.get(socket.id);
          io.to(roomCode).emit(EVENTS.ROOM_UPDATE, { room: sanitizeRoomForBroadcast(result.data.room) });
        } else {
          if (typeof callback === 'function') callback({ success: false, error: result.error });
        }
      } catch (err) {
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    socket.on(EVENTS.START_GAME, (data, callback) => {
      try {
        const result = roomManager.startGame(socket.id);
        if (result.success) {
          const room = roomManager.getRoomByCode(result.data.roomCode);
          const { createMatchState } = require('../game/gameState.js');
          
          room.match = createMatchState(room);
          room.status = 'in_progress';

          if (typeof callback === 'function') callback({ success: true });
          io.to(result.data.roomCode).emit(EVENTS.ROOM_UPDATE, { room: sanitizeRoomForBroadcast(room) });
          io.to(result.data.roomCode).emit(EVENTS.PHASE_CHANGE, { phase: PHASE.EXPLORE, message: "Match starting" });
        } else {
          if (typeof callback === 'function') callback({ success: false, error: result.error });
        }
      } catch (err) {
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    socket.on(EVENTS.RETURN_TO_LOBBY, (data, callback) => {
      try {
        const result = roomManager.returnToLobby(socket.id);
        if (result.success) {
          if (typeof callback === 'function') callback({ success: true });
          io.to(result.data.roomCode).emit(EVENTS.ROOM_UPDATE, { room: sanitizeRoomForBroadcast(result.data.room) });
          io.to(result.data.roomCode).emit(EVENTS.PHASE_CHANGE, { phase: PHASE.LOBBY, message: "Returning to lobby" });
        } else {
          if (typeof callback === 'function') callback({ success: false, error: result.error });
        }
      } catch (err) {
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    socket.on(EVENTS.KICK_PLAYER, (data, callback) => {
      try {
        const roomCode = roomManager.socketToRoom.get(socket.id);
        const room = roomManager.getRoomByCode(roomCode);
        if (!room) throw new Error("Not in a room");
        let targetSocketId = null;
        for (const sid in room.players) {
          if (room.players[sid].id === data.targetPlayerId) {
             targetSocketId = sid;
             break;
          }
        }
        if (!targetSocketId) throw new Error("Player not found");
        
        const result = roomManager.kickPlayer(socket.id, targetSocketId);
        if (result.success) {
          if (typeof callback === 'function') callback({ success: true });
          
          io.to(targetSocketId).emit(EVENTS.ROOM_ERROR, { message: 'You have been kicked by the host' });
          const kickedSocket = io.sockets.sockets.get(targetSocketId);
          if (kickedSocket) kickedSocket.leave(roomCode);
          
          if (!result.data.roomDeleted) {
            const room = roomManager.getRoomByCode(roomCode);
            io.to(roomCode).emit(EVENTS.PLAYER_LEFT, { 
              playerId: targetSocketId, 
              newHostId: result.data.newHostId,
              room: sanitizeRoomForBroadcast(room)
            });
          }
        } else {
          if (typeof callback === 'function') callback({ success: false, error: result.error });
        }
      } catch (err) {
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    socket.on('DEBUG_ADD_BOT', (data, callback) => {
      try {
        const result = roomManager.addBot(socket.id);
        if (result.success) {
          if (typeof callback === 'function') callback({ success: true });
          const roomCode = roomManager.socketToRoom.get(socket.id);
          io.to(roomCode).emit(EVENTS.ROOM_UPDATE, { room: sanitizeRoomForBroadcast(result.data.room) });
          broadcastSystemMessage(io, roomCode, `A bot was added to the room.`);
        } else {
          if (typeof callback === 'function') callback({ success: false, error: result.error });
        }
      } catch (err) {
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    socket.on(EVENTS.SEND_CHAT_MESSAGE, (data, callback) => {
      try {
        const roomCode = roomManager.socketToRoom.get(socket.id);
        const room = roomManager.getRoomByCode(roomCode);
        if (!room) throw new Error("Not in a room");
        
        const player = room.players[socket.id];
        if (!player) throw new Error("Player not found in room");
        
        if (!data.text || typeof data.text !== 'string' || data.text.trim() === '') {
           throw new Error("Invalid message");
        }
        
        const message = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          senderId: socket.id,
          senderName: player.name,
          senderTeam: player.team,
          text: data.text.trim().substring(0, 100), // Max 100 chars
          timestamp: Date.now(),
          isSystem: false
        };
        
        // Broadcast to everyone in room
        io.to(roomCode).emit(EVENTS.CHAT_MESSAGE_RECEIVED, message);
        
        if (typeof callback === 'function') callback({ success: true });
      } catch (err) {
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    // In-Game Events
    socket.on(EVENTS.PLAYER_MOVE, (position) => {
      const roomCode = roomManager.socketToRoom.get(socket.id);
      if (roomCode) {
         const room = roomManager.getRoomByCode(roomCode);
         if (room && room.status === 'in_progress' && room.players[socket.id]) {
            room.players[socket.id].position = position;
         }
      }
    });

    socket.on(EVENTS.USE_GIFT, () => {
      const roomCode = roomManager.socketToRoom.get(socket.id);
      if (roomCode) {
         const room = roomManager.getRoomByCode(roomCode);
         if (room && room.status === 'in_progress' && room.players[socket.id]) {
            const p = room.players[socket.id];
            if (p.activeGift) {
               const { GIFT } = require('../../../shared/constants.js');
               const now = Date.now();
               const giftType = p.activeGift;
               
               if (giftType === GIFT.DASH) {
                  p.activeEffects[GIFT.DASH] = now + 3000;
               } else if (giftType === GIFT.SHIELD) {
                  p.activeEffects[GIFT.SHIELD] = now + 5000;
               } else if (giftType === GIFT.COMPASS) {
                  p.activeEffects[GIFT.COMPASS] = now + 10000;
               } else if (giftType === GIFT.FREEZE) {
                  for (const enemyId in room.players) {
                     const enemy = room.players[enemyId];
                     if (enemy.team !== p.team && enemy.position) {
                        const dist = Math.sqrt(
                          Math.pow(p.position.x - enemy.position.x, 2) +
                          Math.pow(p.position.y - enemy.position.y, 2)
                        );
                        if (dist < 5.0) {
                           enemy.activeEffects[GIFT.FREEZE] = now + 3000;
                        }
                     }
                  }
               }
               p.activeGift = null;
               io.to(roomCode).emit(EVENTS.USE_GIFT, { playerId: socket.id, type: giftType });
            }
         }
      }
    });

    socket.on('disconnect', () => {
      if (process.env.DEBUG === 'true') {
        console.log(`[Socket Disconnected]: ${socket.id}`);
      }
      try {
        const roomCode = roomManager.socketToRoom.get(socket.id);
        if (roomCode) {
          const result = roomManager.handleDisconnect(socket.id);
          if (result.success) {
            const room = roomManager.getRoomByCode(roomCode);
            io.to(roomCode).emit(EVENTS.PLAYER_LEFT, { 
              playerId: result.data.playerId, 
              isTemporary: true, 
              newHostId: result.data.newHostId,
              room: sanitizeRoomForBroadcast(room)
            });
          }
        }
      } catch (err) {
        console.error('Disconnect handling error:', err);
      }
    });
  });
}
module.exports = { registerHandlers };
