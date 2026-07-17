const { GAME_CONFIG, EVENTS } = require('../../../shared/constants.js');
const { updateBots } = require('./botAI.js');

let loopTimer = null;

function startGameLoop(io, roomManager) {
  if (loopTimer) return;

  const tickInterval = Math.floor(1000 / GAME_CONFIG.TICK_RATE); // 50ms

  loopTimer = setInterval(() => {
    const rooms = roomManager.rooms;
    const now = Date.now();

    for (const [roomCode, room] of rooms.entries()) {
      // Only process rooms that are in a game match
      if (room.status === 'in_progress' && room.match) {
        const match = room.match;

        // Process Bot AI
        updateBots(room, GAME_CONFIG.TICK_RATE / 1000);

        // --- Gift Logic ---
        // Clean up expired effects
        for (const playerId in room.players) {
           const p = room.players[playerId];
           if (p.activeEffects) {
             for (const effect in p.activeEffects) {
               if (now > p.activeEffects[effect]) {
                 delete p.activeEffects[effect];
               }
             }
           }
        }

        // Check for Gift Pickup
        if (match.gifts && match.gifts.length > 0) {
             for (const playerId in room.players) {
               const p = room.players[playerId];
               if (p.isSpectator) continue;
               if (p.position && p.isConnected && !p.activeGift) {
               // Find closest gift
               for (let i = 0; i < match.gifts.length; i++) {
                 const gift = match.gifts[i];
                 const dx = p.position.x - gift.position.x;
                 const dy = p.position.y - gift.position.y;
                 if (Math.sqrt(dx * dx + dy * dy) < 0.8) {
                    p.activeGift = gift.type;
                    match.gifts.splice(i, 1);
                    io.to(roomCode).emit(EVENTS.GIFT_PICKUP, { playerId, type: gift.type });
                    break;
                 }
               }
             }
           }
        }

        // --- Sudden Death Logic ---
        const { GAME_CONFIG, TILE } = require('../../../shared/constants.js');
        if (match.phase !== 'MATCH_END') {
           const matchTimeElapsed = now - match.startedAt;
           // Trigger sudden death at 5 minutes (300,000 ms) or whatever the match duration is
           if (match.phase !== 'SUDDEN_DEATH' && matchTimeElapsed >= (match.duration || 300000)) {
              match.phase = 'SUDDEN_DEATH';
              match.suddenDeath.active = true;
              match.suddenDeath.startedAt = now;
              io.to(roomCode).emit(EVENTS.PHASE_CHANGE, { phase: 'SUDDEN_DEATH' });
           } else if (match.phase === 'SUDDEN_DEATH') {
              const suddenDeathElapsed = now - match.suddenDeath.startedAt;
              if (suddenDeathElapsed >= GAME_CONFIG.SUDDEN_DEATH_DURATION) {
                 room.status = 'finished';
                 match.phase = 'MATCH_END';
                 if (match.lostLight.carrierId) {
                    const carrier = room.players[match.lostLight.carrierId];
                    match.result = { winnerTeam: carrier.team, reason: 'sudden_death_timeout', mvpId: carrier.id };
                 } else {
                    match.result = { winnerTeam: 'DRAW', reason: 'sudden_death_timeout' };
                 }

                 const profiles = require('../data/profiles.js');
                 for (const pid in room.players) {
                   const p = room.players[pid];
                   if (p.profileId) profiles.incrementStat(p.profileId, 'totalGames', 1);
                   if (match.result.winnerTeam !== 'DRAW' && p.team === match.result.winnerTeam && p.profileId) {
                     profiles.incrementStat(p.profileId, 'totalWins', 1);
                   }
                 }
                 
                 io.to(roomCode).emit(EVENTS.MATCH_END, match.result);
              }
           }
        }

        // --- Wall Shift Logic ---
        if (match.phase !== 'MATCH_END' && match.wallShifts.count < GAME_CONFIG.MAX_WALL_SHIFTS && match.wallShifts.nextShiftAt) {
           if (now >= match.wallShifts.nextShiftAt) {
              if (!match.wallShifts.warningActive) {
                 // Pick a 5x5 zone avoiding edges and center (exit)
                 const size = match.maze.length;
                 const center = Math.floor(size / 2);
                 let zx = 0, zy = 0;
                 let validZone = false;
                 let attempts = 0;
                 while (!validZone && attempts < 20) {
                    attempts++;
                    zx = Math.floor(Math.random() * (size - 10)) + 5;
                    zy = Math.floor(Math.random() * (size - 10)) + 5;
                    // Check if it overlaps with center
                    if (zx <= center + 3 && zx + 5 >= center - 3 && zy <= center + 3 && zy + 5 >= center - 3) continue;
                    validZone = true;
                 }
                 if (validZone) {
                    match.wallShifts.warningActive = true;
                    match.wallShifts.pendingShiftZone = { x: zx, y: zy, w: 5, h: 5 };
                    match.wallShifts.nextShiftAt = now + GAME_CONFIG.WALL_SHIFT_WARNING;
                    io.to(roomCode).emit(EVENTS.WALL_SHIFT_WARNING, match.wallShifts.pendingShiftZone);
                 }
              } else {
                 // Execute shift
                 const zone = match.wallShifts.pendingShiftZone;
                 if (zone) {
                    for (let y = zone.y; y < zone.y + zone.h; y++) {
                       for (let x = zone.x; x < zone.x + zone.w; x++) {
                          if (match.maze[y][x] === TILE.WALL || match.maze[y][x] === TILE.FLOOR) {
                             // Randomly toggle
                             match.maze[y][x] = Math.random() > 0.5 ? TILE.WALL : TILE.FLOOR;
                          }
                       }
                    }
                    io.to(roomCode).emit(EVENTS.WALL_SHIFT_EXECUTE, { zone, maze: match.maze });
                 }
                 match.wallShifts.warningActive = false;
                 match.wallShifts.pendingShiftZone = null;
                 match.wallShifts.nextShiftAt = now + 60000;
                 match.wallShifts.count++;
              }
           }
        }

        // --- Lost Light Logic ---
        if (match.lostLight.isOnFloor && match.lostLight.position) {
          // Check for pickup
          for (const playerId in room.players) {
            const p = room.players[playerId];
            if (p.isSpectator) continue;
            if (p.position && p.isConnected) {
              const dx = p.position.x - match.lostLight.position.x;
              const dy = p.position.y - match.lostLight.position.y;
              if (Math.sqrt(dx * dx + dy * dy) < 0.8) {
                match.lostLight.isOnFloor = false;
                match.lostLight.carrierId = playerId;
                match.lostLight.foundAt = now;
                match.lostLight.pickupImmunityUntil = now + GAME_CONFIG.PICKUP_IMMUNITY;
                io.to(roomCode).emit(EVENTS.LIGHT_FOUND, { playerId, playerName: p.name });
                break;
              }
            }
          }
        } else if (match.lostLight.carrierId) {
          // Check for tagging/stealing
          const carrierId = match.lostLight.carrierId;
          const carrier = room.players[carrierId];
          
          // If carrier disconnects, drop the light
          if (!carrier || !carrier.isConnected) {
             match.lostLight.isOnFloor = true;
             match.lostLight.carrierId = null;
             match.lostLight.position = carrier ? { ...carrier.position } : match.lostLight.position;
             io.to(roomCode).emit(EVENTS.LIGHT_DROPPED, { reason: 'disconnect' });
          } else if (now > (match.lostLight.pickupImmunityUntil || 0) && (!carrier.activeEffects || !carrier.activeEffects[require('../../../shared/constants.js').GIFT.SHIELD])) {
            // Check enemies in radius
            for (const playerId in room.players) {
              if (playerId === carrierId) continue;
              const p = room.players[playerId];
              if (p.isSpectator) continue;
              if (p.position && p.team !== carrier.team && p.isConnected) {
                const dx = p.position.x - carrier.position.x;
                const dy = p.position.y - carrier.position.y;
                if (Math.sqrt(dx * dx + dy * dy) <= GAME_CONFIG.TAG_RADIUS) {
                  // Tag successful
                  match.lostLight.carrierId = playerId;
                  match.lostLight.transferCount++;
                  match.lostLight.pickupImmunityUntil = now + GAME_CONFIG.PICKUP_IMMUNITY;
                  
                  if (p.profileId) {
                    const profiles = require('../data/profiles.js');
                    profiles.incrementStat(p.profileId, 'totalTags', 1);
                  }
                  
                  io.to(roomCode).emit(EVENTS.LIGHT_TRANSFER, { fromId: carrierId, toId: playerId, toName: p.name });
                  break;
                }
              }
            }
          }

          // Check for Channeling at the Exit
          if (carrier && carrier.isConnected) {
            if (!match.exit.position) {
              for (let y = 0; y < match.maze.length; y++) {
                for (let x = 0; x < match.maze[y].length; x++) {
                   if (match.maze[y][x] === 4) { // TILE.EXIT
                      match.exit.position = { x: x + 0.5, y: y + 0.5 };
                   }
                }
              }
            }
            if (match.exit.position) {
              const distToExit = Math.sqrt(
                 Math.pow(carrier.position.x - match.exit.position.x, 2) + 
                 Math.pow(carrier.position.y - match.exit.position.y, 2)
              );
              
              if (distToExit < 2.0) { // close to the door
                 if (!match.channel.startedAt || match.channel.interrupted) {
                    match.channel.playerId = carrierId;
                    match.channel.startedAt = now;
                    match.channel.interrupted = false;
                    io.to(roomCode).emit(EVENTS.CHANNEL_START, { playerId: carrierId, team: carrier.team });
                 } else {
                    const elapsed = now - match.channel.startedAt;
                    match.channel.progress = Math.min(1, elapsed / GAME_CONFIG.CHANNEL_DURATION);
                    if (elapsed >= GAME_CONFIG.CHANNEL_DURATION) {
                       room.status = 'finished';
                       match.phase = 'MATCH_END';
                       match.result = { winnerTeam: carrier.team, reason: 'channel_complete', mvpId: carrierId };
                       
                       const profiles = require('../data/profiles.js');
                       for (const pid in room.players) {
                         const p = room.players[pid];
                         if (p.profileId) profiles.incrementStat(p.profileId, 'totalGames', 1);
                         if (p.team === carrier.team && p.profileId) {
                           profiles.incrementStat(p.profileId, 'totalWins', 1);
                         }
                       }
                       if (carrier.profileId) {
                         profiles.incrementStat(carrier.profileId, 'totalEscapes', 1);
                       }
                       
                       io.to(roomCode).emit(EVENTS.MATCH_END, match.result);
                    }
                 }
              } else if (match.channel.startedAt && !match.channel.interrupted) {
                 match.channel.startedAt = null;
                 match.channel.progress = 0;
                 match.channel.interrupted = true;
                 io.to(roomCode).emit(EVENTS.CHANNEL_PROGRESS, { progress: 0, interrupted: true });
              }
            }
          }
        }
        
        // Broadcast the entire room state (players, match state) 
        // In a highly optimized game, we'd only send deltas. 
        // For this architecture, we send the room object (minus large static maze if possible, 
        // but for now we send what clients need). 
        // We actually just need to send player positions and dynamic match state.
        // Let's send the whole room object to keep it simple, but we can omit the maze to save bandwidth.
        
        const statePayload = {
          players: room.players,
          match: {
            ...room.match,
            maze: undefined // Do not broadcast the massive 2D array 20 times a second!
          }
        };

        io.to(roomCode).emit('STATE_UPDATE', statePayload);
      }
    }
  }, tickInterval);
}

function stopGameLoop() {
  if (loopTimer) {
    clearInterval(loopTimer);
    loopTimer = null;
  }
}

module.exports = {
  startGameLoop,
  stopGameLoop
};
