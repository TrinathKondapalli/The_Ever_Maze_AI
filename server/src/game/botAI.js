const { GAME_CONFIG, TILE } = require('../../../shared/constants.js');

function updateBots(room, dt) {
  const match = room.match;
  if (!match || match.phase === 'MATCH_END') return;

  const moveSpeed = 4.0 * dt * 0.7; // Bots are 30% slower than players
  
  for (const sid in room.players) {
    if (!sid.startsWith('bot_')) continue;
    
    const bot = room.players[sid];
    if (!bot.position || !bot.isConnected) continue;
    
    // Initialize bot direction if not set
    if (bot.position.dirX === undefined) {
      bot.position.dirX = 1;
      bot.position.dirY = 0;
      bot.stuckTimer = 0;
    }
    
    // Determine Target
    let targetX = null;
    let targetY = null;
    
    const isCarrier = match.lostLight.carrierId === sid;
    
    if (bot.stuckTimer > 0) {
       // If stuck, ignore target and just move in current direction to get unstuck
       targetX = bot.position.x + bot.position.dirX;
       targetY = bot.position.y + bot.position.dirY;
       bot.stuckTimer -= dt;
    } else {
       if (isCarrier) {
          // Target the exit
          if (match.exit && match.exit.position) {
             targetX = match.exit.position.x;
             targetY = match.exit.position.y;
          }
       } else if (match.lostLight.carrierId) {
          // Target the carrier if on enemy team
          const carrier = room.players[match.lostLight.carrierId];
          if (carrier && carrier.team !== bot.team && carrier.position) {
             targetX = carrier.position.x;
             targetY = carrier.position.y;
          } else {
             // Wander (or defend) if teammate has it
             targetX = bot.position.x + bot.position.dirX;
             targetY = bot.position.y + bot.position.dirY;
          }
       } else if (match.lostLight.isOnFloor && match.lostLight.position) {
          // Target the lost light
          targetX = match.lostLight.position.x;
          targetY = match.lostLight.position.y;
       }
    }
    
    // Smooth Rotation towards target
    if (targetX !== null && targetY !== null) {
       const dx = targetX - bot.position.x;
       const dy = targetY - bot.position.y;
       const dist = Math.sqrt(dx * dx + dy * dy);
       
       if (dist > 0.1) {
          const desiredDirX = dx / dist;
          const desiredDirY = dy / dist;
          
          bot.position.dirX = bot.position.dirX * 0.9 + desiredDirX * 0.1;
          bot.position.dirY = bot.position.dirY * 0.9 + desiredDirY * 0.1;
          
          const dirLen = Math.sqrt(bot.position.dirX * bot.position.dirX + bot.position.dirY * bot.position.dirY);
          if (dirLen > 0) {
             bot.position.dirX /= dirLen;
             bot.position.dirY /= dirLen;
          }
       }
    }
    
    // Move Forward
    let actualMoveSpeed = moveSpeed;
    if (isCarrier) actualMoveSpeed *= GAME_CONFIG.CARRIER_SPEED_MULTIPLIER;
    if (bot.activeEffects && bot.activeEffects.FREEZE) actualMoveSpeed = 0;
    
    const nextX = bot.position.x + bot.position.dirX * actualMoveSpeed;
    const nextY = bot.position.y + bot.position.dirY * actualMoveSpeed;
    
    // Collision & Sliding
    const maze = match.maze;
    let movedX = false;
    let movedY = false;
    
    if (maze[Math.floor(bot.position.y)] && maze[Math.floor(bot.position.y)][Math.floor(nextX)] !== TILE.WALL) {
       bot.position.x = nextX;
       movedX = true;
    }
    if (maze[Math.floor(nextY)] && maze[Math.floor(nextY)][Math.floor(bot.position.x)] !== TILE.WALL) {
       bot.position.y = nextY;
       movedY = true;
    }
    
    // If stuck, pick a random direction
    if (!movedX && !movedY && bot.stuckTimer <= 0) {
       const angle = Math.random() * Math.PI * 2;
       bot.position.dirX = Math.cos(angle);
       bot.position.dirY = Math.sin(angle);
       bot.stuckTimer = 1.0; // Wander in new direction for 1 second
    } else if ((!movedX || !movedY) && bot.stuckTimer <= 0) {
       // Sliding against a wall, sometimes get stuck in corners, so add a small chance to re-path
       if (Math.random() < 0.05) {
          const angle = Math.random() * Math.PI * 2;
          bot.position.dirX = Math.cos(angle);
          bot.position.dirY = Math.sin(angle);
          bot.stuckTimer = 0.5; 
       }
    }
  }
}

module.exports = { updateBots };
