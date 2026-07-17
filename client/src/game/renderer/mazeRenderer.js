import { TILE, GAME_CONFIG } from '../../constants/index.js';

const particles = [];

export function spawnExplosion(x, y, colorStr) {
  const count = 30;
  const hex = colorStr.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 0.1 + 0.05;
    particles.push({
      x: x,
      y: y,
      z: 0.5,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      vz: Math.random() * 0.1,
      life: 1.0,
      decay: Math.random() * 0.03 + 0.02,
      r, g, b,
      size: Math.random() * 3 + 2 // px size
    });
  }
}

export function spawnGiftEffect(x, y, type) {
  const count = 40;
  let r = 255, g = 255, b = 255;
  if (type === 'FREEZE') { r = 100; g = 200; b = 255; }
  else if (type === 'DASH') { r = 255; g = 100; b = 100; }
  else if (type === 'SHIELD') { r = 255; g = 200; b = 50; }
  else if (type === 'COMPASS') { r = 100; g = 255; b = 100; }

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 0.15 + 0.05;
    particles.push({
      x: x,
      y: y,
      z: 0.2, 
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      vz: Math.random() * 0.05 + 0.02, 
      life: 1.0,
      decay: Math.random() * 0.02 + 0.01,
      r, g, b,
      size: Math.random() * 4 + 2
    });
  }
}

// ----------------------------------------------------
// ISOMETRIC RENDERER
// ----------------------------------------------------
const TILE_W = 64;
const TILE_H = 32;
const WALL_H = 48;

function toIso(mapX, mapY, z = 0) {
  return {
    screenX: (mapX - mapY) * (TILE_W / 2),
    screenY: (mapX + mapY) * (TILE_H / 2) - (z * WALL_H)
  };
}

export function drawMaze(ctx, maze, width, height, player, allPlayers, myId, lostLight, gifts, myPlayer, matchPhase, headBobOffset = 0) {
  if (!maze || !player) return;

  const isSuddenDeath = matchPhase === 'SUDDEN_DEATH';
  
  // Background
  ctx.fillStyle = isSuddenDeath ? '#2a0808' : '#050b14';
  ctx.fillRect(0, 0, width, height);

  // Camera tracking
  // We want the player's screen position to be exactly at the center of the canvas.
  const myIso = toIso(player.x, player.y, 0);
  const cameraOffsetX = (width / 2) - myIso.screenX;
  const cameraOffsetY = (height / 2) - myIso.screenY + (WALL_H / 2); // Center slightly higher to account for walls

  const renderables = [];

  // Visibility radius
  const viewRadius = myPlayer?.isSpectator ? 1000 : GAME_CONFIG.VISIBILITY_RADIUS;

  // 1. Build renderables for the maze (Floors and Walls)
  for (let mapY = 0; mapY < maze.length; mapY++) {
    for (let mapX = 0; mapX < maze[0].length; mapX++) {
      
      // Distance check from camera center (player)
      const dist = Math.sqrt(Math.pow(mapX - player.x, 2) + Math.pow(mapY - player.y, 2));
      if (dist > viewRadius + 2) continue; // cull outside view

      const tile = maze[mapY][mapX];
      const iso = toIso(mapX, mapY, 0);
      const drawX = iso.screenX + cameraOffsetX;
      const drawY = iso.screenY + cameraOffsetY;
      
      // Calculate lighting/fog based on distance
      let intensity = 1.0 - (dist / viewRadius);
      if (intensity < 0) intensity = 0;
      intensity = Math.pow(intensity, 0.6); // smooth falloff
      
      // Always add the floor tile
      renderables.push({
        type: 'floor',
        mapX, mapY,
        depth: mapX + mapY,
        drawX, drawY,
        intensity,
        tile
      });

      // Add wall block if it's a wall or exit
      if (tile === TILE.WALL || tile === TILE.ENTRANCE_A || tile === TILE.ENTRANCE_B || tile === TILE.EXIT) {
        renderables.push({
          type: 'wall',
          mapX, mapY,
          depth: mapX + mapY + 0.1, // slightly above floor depth
          drawX, drawY,
          intensity,
          tile,
          isSuddenDeath
        });
      }
    }
  }

  // 2. Build renderables for Players
  if (allPlayers) {
    for (const id in allPlayers) {
      const p = allPlayers[id];
      if (p.position) {
        const pX = p.position.x;
        const pY = p.position.y;
        const dist = Math.sqrt(Math.pow(pX - player.x, 2) + Math.pow(pY - player.y, 2));
        
        if (dist <= viewRadius || id === myId) {
          const iso = toIso(pX, pY, 0);
          renderables.push({
            type: 'player',
            mapX: pX, mapY: pY,
            depth: pX + pY + 0.2, // above wall base
            drawX: iso.screenX + cameraOffsetX,
            drawY: iso.screenY + cameraOffsetY,
            intensity: Math.max(0.2, 1.0 - (dist / viewRadius)),
            team: p.team,
            color: p.color,
            isCarrier: lostLight?.carrierId === id,
            isMe: id === myId
          });
        }
      }
    }
  }

  // 3. Lost Light
  if (lostLight && lostLight.isOnFloor && lostLight.position) {
    const pX = lostLight.position.x;
    const pY = lostLight.position.y;
    const iso = toIso(pX, pY, 0.2); // floats slightly
    renderables.push({
      type: 'light',
      mapX: pX, mapY: pY,
      depth: pX + pY + 0.2,
      drawX: iso.screenX + cameraOffsetX,
      drawY: iso.screenY + cameraOffsetY
    });
  }

  // 4. Gifts
  if (gifts && gifts.length > 0) {
    gifts.forEach(g => {
      const pX = g.position.x;
      const pY = g.position.y;
      const iso = toIso(pX, pY, 0);
      renderables.push({
        type: 'gift',
        mapX: pX, mapY: pY,
        depth: pX + pY + 0.2,
        drawX: iso.screenX + cameraOffsetX,
        drawY: iso.screenY + cameraOffsetY
      });
    });
  }

  // 5. Sort all renderables by depth (Painter's Algorithm)
  // Smaller depth (x+y) means it's further back (drawn first)
  renderables.sort((a, b) => a.depth - b.depth);

  // 6. Draw everything
  for (const r of renderables) {
    if (r.type === 'floor') {
      drawFloorTile(ctx, r.drawX, r.drawY, r.intensity, r.tile, isSuddenDeath);
    } 
    else if (r.type === 'wall') {
      drawWallBlock(ctx, r.drawX, r.drawY, r.intensity, r.tile, isSuddenDeath);
    }
    else if (r.type === 'player') {
      drawPlayerSprite(ctx, r.drawX, r.drawY, r);
    }
    else if (r.type === 'light') {
      drawLightSprite(ctx, r.drawX, r.drawY);
    }
    else if (r.type === 'gift') {
      drawGiftSprite(ctx, r.drawX, r.drawY);
    }
  }

  // 7. Particles (rendered on top of the world)
  updateAndRenderParticles(ctx, cameraOffsetX, cameraOffsetY, isSuddenDeath);
}

// ----------------------------------------------------
// RENDERING HELPERS
// ----------------------------------------------------

function drawFloorTile(ctx, drawX, drawY, intensity, tile, isSuddenDeath) {
  let baseColor = isSuddenDeath ? [80, 20, 20] : [20, 30, 45];
  
  if (tile === TILE.ENTRANCE_A) baseColor = [20, 80, 100];
  if (tile === TILE.ENTRANCE_B) baseColor = [100, 30, 70];
  if (tile === TILE.EXIT) baseColor = [100, 100, 20];

  const c = `rgb(${Math.floor(baseColor[0]*intensity)},${Math.floor(baseColor[1]*intensity)},${Math.floor(baseColor[2]*intensity)})`;
  
  ctx.fillStyle = c;
  ctx.strokeStyle = `rgba(0,0,0,${0.5 * intensity})`;
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.moveTo(drawX, drawY - TILE_H/2);
  ctx.lineTo(drawX + TILE_W/2, drawY);
  ctx.lineTo(drawX, drawY + TILE_H/2);
  ctx.lineTo(drawX - TILE_W/2, drawY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawWallBlock(ctx, drawX, drawY, intensity, tile, isSuddenDeath) {
  let topC = isSuddenDeath ? [180, 40, 40] : [80, 100, 120];
  let leftC = isSuddenDeath ? [120, 20, 20] : [50, 70, 90];
  let rightC = isSuddenDeath ? [80, 10, 10] : [30, 40, 60];

  if (tile === TILE.ENTRANCE_A) { topC = [34, 211, 238]; leftC = [20, 160, 190]; rightC = [10, 100, 130]; }
  if (tile === TILE.ENTRANCE_B) { topC = [244, 114, 182]; leftC = [200, 80, 150]; rightC = [150, 40, 100]; }
  if (tile === TILE.EXIT) { topC = [250, 204, 21]; leftC = [200, 160, 10]; rightC = [150, 100, 0]; }

  const applyI = (col) => `rgb(${Math.floor(col[0]*intensity)},${Math.floor(col[1]*intensity)},${Math.floor(col[2]*intensity)})`;

  // Draw Top Face (diamond shifted up)
  const topY = drawY - WALL_H;
  ctx.fillStyle = applyI(topC);
  ctx.beginPath();
  ctx.moveTo(drawX, topY - TILE_H/2);
  ctx.lineTo(drawX + TILE_W/2, topY);
  ctx.lineTo(drawX, topY + TILE_H/2);
  ctx.lineTo(drawX - TILE_W/2, topY);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = `rgba(255,255,255,${0.2 * intensity})`;
  ctx.stroke();

  // Draw Left Face
  ctx.fillStyle = applyI(leftC);
  ctx.beginPath();
  ctx.moveTo(drawX - TILE_W/2, topY);
  ctx.lineTo(drawX, topY + TILE_H/2);
  ctx.lineTo(drawX, drawY + TILE_H/2);
  ctx.lineTo(drawX - TILE_W/2, drawY);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = `rgba(0,0,0,${0.3 * intensity})`;
  ctx.stroke();

  // Draw Right Face
  ctx.fillStyle = applyI(rightC);
  ctx.beginPath();
  ctx.moveTo(drawX, topY + TILE_H/2);
  ctx.lineTo(drawX + TILE_W/2, topY);
  ctx.lineTo(drawX + TILE_W/2, drawY);
  ctx.lineTo(drawX, drawY + TILE_H/2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawPlayerSprite(ctx, drawX, drawY, r) {
  const intensity = r.intensity;
  
  // Base shadow
  ctx.fillStyle = `rgba(0,0,0,${0.6 * intensity})`;
  ctx.beginPath();
  ctx.ellipse(drawX, drawY, 14, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  let colorHex = '#ffffff';
  if (r.isCarrier) colorHex = '#fde047'; // yellow-300
  else if (r.color) colorHex = r.color;
  else colorHex = r.team === 'A' ? '#06b6d4' : '#ec4899';

  // Body
  const playerZ = 20; // height above floor
  const headY = drawY - playerZ;
  
  ctx.fillStyle = colorHex;
  ctx.globalAlpha = intensity;
  
  // Simple capsule/pill shape
  ctx.beginPath();
  ctx.arc(drawX, headY, 10, Math.PI, 0);
  ctx.lineTo(drawX + 10, drawY);
  ctx.lineTo(drawX - 10, drawY);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = 1.0;

  // Glow if carrier or me
  if (r.isCarrier || r.isMe) {
    ctx.shadowBlur = 15;
    ctx.shadowColor = colorHex;
    ctx.beginPath();
    ctx.arc(drawX, headY, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

function drawLightSprite(ctx, drawX, drawY) {
  const time = Date.now() / 200;
  const floatY = drawY - 15 + Math.sin(time) * 5;

  ctx.shadowBlur = 20;
  ctx.shadowColor = '#fde047';
  ctx.fillStyle = '#fef08a';
  ctx.beginPath();
  ctx.arc(drawX, floatY, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawGiftSprite(ctx, drawX, drawY) {
  const time = Date.now() / 200;
  const floatY = drawY - 10 + Math.sin(time) * 3;

  ctx.shadowBlur = 15;
  ctx.shadowColor = '#4ade80';
  ctx.fillStyle = '#86efac';
  
  // draw small box
  ctx.beginPath();
  ctx.rect(drawX - 6, floatY - 6, 12, 12);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function updateAndRenderParticles(ctx, camOffX, camOffY, isSuddenDeath) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    
    // update physics
    p.x += p.vx;
    p.y += p.vy;
    p.z += p.vz;
    p.vz -= 0.005; // gravity
    if (p.z < 0) {
       p.z = 0;
       p.vz *= -0.5; // bounce
    }
    
    p.life -= p.decay;

    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }

    // render
    const iso = toIso(p.x, p.y, p.z);
    const drawX = iso.screenX + camOffX;
    const drawY = iso.screenY + camOffY;

    ctx.globalAlpha = p.life;
    ctx.fillStyle = `rgb(${p.r},${p.g},${p.b})`;
    ctx.beginPath();
    ctx.arc(drawX, drawY, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;
}
