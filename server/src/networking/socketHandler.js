import { EVENTS, TREASURE_STATE, MATCH_STATE, TEAM } from '../../../shared/constants.js';
import { GAME_CONFIG } from '../../../shared/gameConfig.js';
import { isValidUuidV4 } from '../sessions/sessionManager.js';
import { generateMap } from '../map/mapGenerator.js';
import { TreasureManager } from '../game/treasureManager.js';
import { PlayerState } from '../game/playerState.js';
import { GameLoop } from '../game/gameLoop.js';
import { CombatManager } from '../game/combatManager.js';

/**
 * Sanitizes the room object to send to clients.
 * Excludes secret session IDs to prevent session hijacking.
 * Maps players by their public socketId instead of sessionId.
 */
function sanitizeRoom(room) {
  if (!room) return null;

  const sanitizedPlayers = {};
  let hostSocketId = null;

  Object.values(room.players).forEach((p) => {
    sanitizedPlayers[p.socketId] = {
      id: p.socketId,
      name: p.name,
      team: p.team,
      isReady: p.isReady,
      isHost: p.isHost
    };
    if (p.isHost) {
      hostSocketId = p.socketId;
    }
  });

  return {
    code: room.code,
    hostSocketId,
    matchState: room.matchState,
    players: sanitizedPlayers,
    chatMessages: room.chatMessages,
    mapSeed: room.map ? room.map.seed : null
  };
}

export function registerSocketHandlers(io, roomManager, sessionManager) {
  // Socket.io Connection Middleware for Authentication
  io.use((socket, next) => {
    const { sessionId, playerName } = socket.handshake.auth;

    if (!sessionId || !isValidUuidV4(sessionId)) {
      return next(new Error(EVENTS.AUTH_FAIL));
    }

    // Try to create/restore the session
    const session = sessionManager.handleSessionHandshake(sessionId, playerName, socket.id);
    if (!session) {
      return next(new Error(EVENTS.AUTH_FAIL));
    }

    socket.session = session;
    next();
  });

  io.on('connection', (socket) => {
    console.log(`[Socket Connected]: ${socket.id} (Session: ${socket.session.sessionId})`);

    // Emit AUTH_SUCCESS immediately upon connection
    socket.emit(EVENTS.AUTH_SUCCESS, {
      sessionId: socket.session.sessionId,
      playerName: socket.session.playerName
    });

    // Check if the player is reconnecting to an active room
    const existingRoom = roomManager.getRoomByPlayer(socket.session.sessionId);
    if (existingRoom) {
      // Re-join the Socket.io room channel
      socket.join(existingRoom.code);
      
      // Update socket ID on player object
      existingRoom.players[socket.session.sessionId].socketId = socket.id;

      // Broadcast room update
      io.to(existingRoom.code).emit(EVENTS.ROOM_UPDATE, {
        room: sanitizeRoom(existingRoom)
      });
    }

    // ── CREATE ROOM ──
    socket.on(EVENTS.CREATE_ROOM, () => {
      try {
        const room = roomManager.createRoom(socket.session);
        socket.join(room.code);
        
        io.to(room.code).emit(EVENTS.ROOM_UPDATE, {
          room: sanitizeRoom(room)
        });
      } catch (err) {
        socket.emit(EVENTS.ROOM_ERROR, { message: err.message });
      }
    });

    // ── JOIN ROOM ──
    socket.on(EVENTS.JOIN_ROOM, (data) => {
      const { roomCode } = data || {};
      try {
        const room = roomManager.joinRoom(roomCode, socket.session);
        socket.join(room.code);
        
        io.to(room.code).emit(EVENTS.ROOM_UPDATE, {
          room: sanitizeRoom(room)
        });
      } catch (err) {
        socket.emit(EVENTS.ROOM_ERROR, { message: err.message });
      }
    });

    // ── LEAVE ROOM ──
    socket.on(EVENTS.LEAVE_ROOM, () => {
      const sessionId = socket.session.sessionId;
      const room = roomManager.getRoomByPlayer(sessionId);
      if (!room) return;

      const code = room.code;
      roomManager.leaveRoom(sessionId);
      socket.leave(code);

      // Notify remaining players in the room
      io.to(code).emit(EVENTS.ROOM_UPDATE, {
        room: sanitizeRoom(roomManager.getRoom(code))
      });

      // Confirm to leaving player
      socket.emit(EVENTS.ROOM_UPDATE, { room: null });
    });

    // ── SWITCH TEAM ──
    socket.on(EVENTS.SWITCH_TEAM, (data) => {
      const { team } = data || {};
      try {
        const room = roomManager.switchTeam(socket.session.sessionId, team);
        io.to(room.code).emit(EVENTS.ROOM_UPDATE, {
          room: sanitizeRoom(room)
        });
      } catch (err) {
        socket.emit(EVENTS.ROOM_ERROR, { message: err.message });
      }
    });

    // ── TOGGLE READY ──
    socket.on(EVENTS.TOGGLE_READY, () => {
      try {
        const room = roomManager.toggleReady(socket.session.sessionId);
        io.to(room.code).emit(EVENTS.ROOM_UPDATE, {
          room: sanitizeRoom(room)
        });
      } catch (err) {
        socket.emit(EVENTS.ROOM_ERROR, { message: err.message });
      }
    });

    // ── KICK PLAYER ──
    socket.on(EVENTS.KICK_PLAYER, (data) => {
      const { targetPlayerId } = data || {};
      try {
        const room = roomManager.getRoomByPlayer(socket.session.sessionId);
        if (!room) throw new Error('Not in a room.');

        const targetPlayer = Object.values(room.players).find(p => p.socketId === targetPlayerId);
        if (!targetPlayer) throw new Error('Target player not found.');

        const result = roomManager.kickPlayer(socket.session.sessionId, targetPlayer.sessionId);
        
        // Find the target socket and remove it from channel, notify it
        const kickedSocket = io.sockets.sockets.get(result.kickedSocketId);
        if (kickedSocket) {
          kickedSocket.leave(result.room.code);
          kickedSocket.emit(EVENTS.ROOM_ERROR, { message: 'You were kicked by the host.' });
          kickedSocket.emit(EVENTS.ROOM_UPDATE, { room: null });
        }

        io.to(result.room.code).emit(EVENTS.ROOM_UPDATE, {
          room: sanitizeRoom(result.room)
        });
      } catch (err) {
        socket.emit(EVENTS.ROOM_ERROR, { message: err.message });
      }
    });

    // ── START GAME ──
    socket.on(EVENTS.START_GAME, () => {
      try {
        const room = roomManager.startGame(socket.session.sessionId);
        
        io.to(room.code).emit(EVENTS.ROOM_UPDATE, {
          room: sanitizeRoom(room)
        });

        // Countdown flow
        let countdown = GAME_CONFIG.COUNTDOWN_SECONDS;
        const interval = setInterval(() => {
          countdown--;
          if (countdown <= 0) {
            clearInterval(interval);
            
            // Generate seed and map
            const seed = Math.floor(Math.random() * 2147483647);
            room.map = generateMap(seed);

            // Attach treasure manager
            room.treasure = new TreasureManager(room.map);

            // Initialize PlayerStates
            for (const [sessionId, player] of Object.entries(room.players)) {
              const spawnPos = player.team === TEAM.A ? room.map.spawnA : room.map.spawnB;
              room.playerStates[sessionId] = new PlayerState(
                sessionId,
                player.name,
                player.team,
                spawnPos
              );
            }

            // Start Game Loop
            room.gameLoop = new GameLoop(room, io);
            room.gameLoop.start();

            // Reached zero: transition to loading map stage
            room.matchState = 'MAP_LOADING';

            // Broadcast match start seed
            io.to(room.code).emit(EVENTS.MATCH_START, { seed });

            io.to(room.code).emit(EVENTS.ROOM_UPDATE, {
              room: sanitizeRoom(room)
            });
          } else {
            // Emitting custom countdown updates could be added, but standard room update triggers it
            io.to(room.code).emit(EVENTS.ROOM_UPDATE, {
              room: sanitizeRoom(room)
            });
          }
        }, 1000);

      } catch (err) {
        socket.emit(EVENTS.ROOM_ERROR, { message: err.message });
      }
    });

    // ── PLAYER MOVE ──
    socket.on(EVENTS.PLAYER_MOVE, (inputPacket) => {
      try {
        const sessionId = socket.session.sessionId;
        const room = roomManager.getRoomByPlayer(sessionId);
        
        if (!room || !room.gameLoop || !room.playerStates[sessionId]) return;
        
        room.playerStates[sessionId].inputQueue.push(inputPacket);
      } catch (err) {
        // Silently ignore to avoid spamming errors on movement frame
      }
    });

    // ── PLAYER ATTACK ──
    socket.on(EVENTS.PLAYER_ATTACK, () => {
      try {
        const sessionId = socket.session.sessionId;
        const room = roomManager.getRoomByPlayer(sessionId);
        if (!room || !room.gameLoop) return;

        const attackerState = room.playerStates[sessionId];
        if (!attackerState || attackerState.health <= 0) return;

        const hits = CombatManager.evaluateAttack(attackerState, room.playerStates);

        for (const targetId of hits) {
          const targetState = room.playerStates[targetId];

          // Deduct health
          targetState.health -= 1;

          if (targetState.health <= 0) {
            targetState.health = 0;
            
            // 1. Drop or Steal Treasure if carrying
            if (room.treasure && room.treasure.carrierId === targetId) {
              const stealResult = room.treasure.trySteal(attackerState);
              if (stealResult.ok) {
                io.to(room.code).emit(EVENTS.TREASURE_STOLEN, {
                  previousCarrierId: targetId,
                  newCarrierId: sessionId,
                  newCarrierTeam: attackerState.team,
                  treasure: room.treasure.toSnapshot()
                });
              } else {
                // Steal failed (maybe same team), force drop
                room.treasure.forceDrop(targetState);
              }
            }

            // 2. Broadcast elimination
            io.to(room.code).emit(EVENTS.PLAYER_ELIMINATED, { id: targetId });

            // 3. Schedule Respawn
            setTimeout(() => {
              // Ensure room and player still exist
              const currentRoom = roomManager.getRoom(room.code);
              if (currentRoom && currentRoom.playerStates[targetId]) {
                const pState = currentRoom.playerStates[targetId];
                pState.health = GAME_CONFIG.PLAYER_MAX_HEALTH;
                
                // Reset position to spawn
                const spawnPos = pState.team === TEAM.A ? currentRoom.map.spawnA : currentRoom.map.spawnB;
                pState.x = spawnPos.worldX;
                pState.y = 0;
                pState.z = spawnPos.worldZ;

                io.to(currentRoom.code).emit(EVENTS.PLAYER_RESPAWNED, {
                  id: targetId,
                  health: pState.health,
                  x: pState.x,
                  y: pState.y,
                  z: pState.z
                });
              }
            }, GAME_CONFIG.RESPAWN_DELAY_MS);
          }
        }
      } catch (err) {
        // Silently ignore
      }
    });

    // ── TREASURE PICKUP ──
    socket.on(EVENTS.TREASURE_PICKUP, (data) => {
      try {
        const sessionId = socket.session.sessionId;
        const room = roomManager.getRoomByPlayer(sessionId);
        if (!room || !room.treasure) return;

        const player = room.players[sessionId];
        if (!player) return;

        const pData = {
          sessionId,
          team: player.team,
          x: data?.x ?? 0,
          z: data?.z ?? 0,
        };

        // Auto-reveal if still hidden
        if (room.treasure.isHidden()) {
          room.treasure.reveal();
          io.to(room.code).emit(EVENTS.TREASURE_FOUND, {
            x: room.treasure.dropX,
            z: room.treasure.dropZ,
          });
        }

        const result = room.treasure.tryPickup(pData);
        if (!result.ok) {
          socket.emit(EVENTS.ROOM_ERROR, { message: result.reason });
          return;
        }

        // Update match state
        room.matchState = MATCH_STATE.TREASURE_FOUND;

        io.to(room.code).emit(EVENTS.TREASURE_FOUND, {
          carrierId:  socket.id,
          carrierTeam: player.team,
          treasure:   room.treasure.toSnapshot(),
        });
      } catch (err) {
        socket.emit(EVENTS.ROOM_ERROR, { message: err.message });
      }
    });

    // ── EXIT ATTEMPT ──
    socket.on(EVENTS.EXIT_ATTEMPT, () => {
      try {
        const sessionId = socket.session.sessionId;
        const room = roomManager.getRoomByPlayer(sessionId);
        if (!room || !room.treasure || !room.map || !room.gameLoop) return;

        const player = room.players[sessionId];
        const pState = room.playerStates[sessionId];
        if (!player || !pState) return;

        // 1. Must be the carrier
        if (room.treasure.carrierId !== sessionId) {
          socket.emit(EVENTS.ROOM_ERROR, { message: 'You are not carrying the treasure.' });
          return;
        }

        // 2. Must be within trigger radius of exit door (server-authoritative check)
        const dx = pState.x - room.map.exitPos.worldX;
        const dz = pState.z - room.map.exitPos.worldZ;
        const distSq = dx * dx + dz * dz;
        const triggerRadius = GAME_CONFIG.EXIT_TRIGGER_RADIUS;

        if (distSq > triggerRadius * triggerRadius) {
          socket.emit(EVENTS.ROOM_ERROR, { message: 'You are too far from the exit door.' });
          return;
        }

        // 3. Victory!
        room.matchState = MATCH_STATE.POST_MATCH;
        room.gameLoop.stop();

        io.to(room.code).emit(EVENTS.MATCH_WIN, {
          team:   player.team,
          carrierId: sessionId,
          reason: 'exit',
        });

        // 4. Start Post-Match Auto-Reset timer (60s)
        setTimeout(() => {
          const currentRoom = roomManager.getRoom(room.code);
          if (currentRoom && currentRoom.matchState === MATCH_STATE.POST_MATCH) {
             // Reset room state for rematch
             currentRoom.matchState = MATCH_STATE.ROOM_LOBBY;
             currentRoom.treasure = null;
             currentRoom.map = null;
             currentRoom.gameLoop = null;
             currentRoom.playerStates = {};
             // Un-ready all players
             Object.values(currentRoom.players).forEach(p => p.isReady = false);

             io.to(currentRoom.code).emit(EVENTS.ROOM_UPDATE, {
               room: sanitizeRoom(currentRoom)
             });
          }
        }, GAME_CONFIG.REMATCH_TIMEOUT_MS);

      } catch (err) {
        socket.emit(EVENTS.ROOM_ERROR, { message: err.message });
      }
    });

    // ── CHAT MESSAGE ──
    socket.on(EVENTS.CHAT_MESSAGE, (data) => {
      const { text } = data || {};
      try {
        const result = roomManager.addChatMessage(socket.session.sessionId, text);
        io.to(result.room.code).emit(EVENTS.CHAT_MESSAGE, {
          message: result.message
        });
      } catch (err) {
        // Silently ignore or send direct error
      }
    });

    // ── DISCONNECT ──
    socket.on('disconnect', () => {
      console.log(`[Socket Disconnected]: ${socket.id}`);
      
      const sessionId = socket.session.sessionId;
      const room = roomManager.getRoomByPlayer(sessionId);
      if (room) {
        // Start 30s cleanup window
        sessionManager.handleDisconnect(socket.id, (expiredSessionId) => {
          const roomToUpdate = roomManager.getRoomByPlayer(expiredSessionId);
          roomManager.leaveRoom(expiredSessionId);
          
          if (roomToUpdate) {
            io.to(roomToUpdate.code).emit(EVENTS.ROOM_UPDATE, {
              room: sanitizeRoom(roomManager.getRoom(roomToUpdate.code))
            });
          }
        });
      }
    });
  });
}
