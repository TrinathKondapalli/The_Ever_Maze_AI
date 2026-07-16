import { TILE, GAME_CONFIG } from '../../constants/index.js';

export function drawMaze(ctx, maze, width, height, player, allPlayers, myId, lostLight, gifts, myPlayer, matchPhase, headBobOffset = 0) {
  if (!maze || !player) return;

  const isSuddenDeath = matchPhase === 'SUDDEN_DEATH';

  const middleY = (height / 2) + headBobOffset;

  // Clear floor and ceiling
  if (isSuddenDeath) {
     ctx.fillStyle = '#450a0a'; // red-950 ceiling
     ctx.fillRect(0, 0, width, middleY);
     ctx.fillStyle = '#7f1d1d'; // red-900 floor
     ctx.fillRect(0, middleY, width, height - middleY);
  } else {
     ctx.fillStyle = '#0f172a'; // slate-900
     ctx.fillRect(0, 0, width, middleY);
     ctx.fillStyle = '#1e293b'; // slate-800
     ctx.fillRect(0, middleY, width, height - middleY);
  }

  const { x, y, dirX, dirY, planeX, planeY } = player;
  
  // Z-Buffer for sprite occlusion
  const zBuffer = new Array(width);

  // Render vertical strips
  for (let xScreen = 0; xScreen < width; xScreen++) {
    // calculate ray position and direction
    let cameraX = 2 * xScreen / width - 1; // x-coordinate in camera space
    let rayDirX = dirX + planeX * cameraX;
    let rayDirY = dirY + planeY * cameraX;

    // which box of the map we're in
    let mapX = Math.floor(x);
    let mapY = Math.floor(y);

    // length of ray from current position to next x or y-side
    let sideDistX;
    let sideDistY;

    // length of ray from one x or y-side to next x or y-side
    let deltaDistX = (rayDirX === 0) ? 1e30 : Math.abs(1 / rayDirX);
    let deltaDistY = (rayDirY === 0) ? 1e30 : Math.abs(1 / rayDirY);
    let perpWallDist;

    // what direction to step in x or y-direction (either +1 or -1)
    let stepX;
    let stepY;

    let hit = 0; // was there a wall hit?
    let side; // was a NS or a EW wall hit?

    // calculate step and initial sideDist
    if (rayDirX < 0) {
      stepX = -1;
      sideDistX = (x - mapX) * deltaDistX;
    } else {
      stepX = 1;
      sideDistX = (mapX + 1.0 - x) * deltaDistX;
    }
    if (rayDirY < 0) {
      stepY = -1;
      sideDistY = (y - mapY) * deltaDistY;
    } else {
      stepY = 1;
      sideDistY = (mapY + 1.0 - y) * deltaDistY;
    }

    // perform DDA
    let tileHit = 0;
    while (hit === 0) {
      // jump to next map square, either in x-direction, or in y-direction
      if (sideDistX < sideDistY) {
        sideDistX += deltaDistX;
        mapX += stepX;
        side = 0;
      } else {
        sideDistY += deltaDistY;
        mapY += stepY;
        side = 1;
      }
      
      // Check boundaries
      if (mapY < 0 || mapY >= maze.length || mapX < 0 || mapX >= maze[0].length) {
         hit = 1; 
         tileHit = TILE.WALL;
         break;
      }

      // Check if ray has hit a wall or exit door
      if (maze[mapY][mapX] === TILE.WALL || maze[mapY][mapX] === TILE.EXIT) {
        hit = 1;
        tileHit = maze[mapY][mapX];
      }
    }

    // Calculate distance projected on camera direction
    if (side === 0) perpWallDist = (sideDistX - deltaDistX);
    else          perpWallDist = (sideDistY - deltaDistY);
    
    // Save to Z-Buffer
    zBuffer[xScreen] = perpWallDist;

    // Calculate height of line to draw on screen
    const lineHeight = Math.floor(height / (perpWallDist || 0.1));
      
    // Calculate lowest and highest pixel to fill in current stripe
    let drawStart = -lineHeight / 2 + middleY;
    if (drawStart < 0) drawStart = 0;
    let drawEnd = lineHeight / 2 + middleY;
    if (drawEnd >= height) drawEnd = height - 1;

    // Fog of war: intensity based on distance
    let maxDist = GAME_CONFIG.VISIBILITY_RADIUS;
    let intensity = 1.0 - (perpWallDist / maxDist);
    if (intensity < 0) intensity = 0;
    if (intensity > 1) intensity = 1;
    
    // Apply a square root curve so it doesn't get dark too fast
    intensity = Math.pow(intensity, 0.5);

    // Pick color based on tile
    let color = [94, 114, 138]; // brighter slate base
    
    switch (tileHit) {
      case TILE.WALL:
        color = isSuddenDeath ? [220, 38, 38] : [94, 114, 138]; // Red walls in SD
        break;
      case TILE.ENTRANCE_A:
        color = [34, 211, 238]; // cyan-400
        break;
      case TILE.ENTRANCE_B:
        color = [244, 114, 182]; // pink-400
        break;
      case TILE.EXIT:
        color = [250, 204, 21]; // yellow-400
        break;
    }
    
    // Give x and y sides different brightness
    if (side === 1) {
      color[0] = Math.floor(color[0] * 0.7);
      color[1] = Math.floor(color[1] * 0.7);
      color[2] = Math.floor(color[2] * 0.7);
    }

    // Apply fog shading (fades to black)
    let r = Math.floor(color[0] * intensity);
    let g = Math.floor(color[1] * intensity);
    let b = Math.floor(color[2] * intensity);
    
    // Draw the vertical line
    ctx.strokeStyle = `rgb(${r},${g},${b})`;
    ctx.beginPath();
    ctx.moveTo(xScreen, drawStart);
    ctx.lineTo(xScreen, drawEnd);
    ctx.stroke();
  }

  // -------------------------
  // SPRITE RENDERING
  // -------------------------
  const sprites = [];
  
  if (allPlayers && myId) {
    for (const id in allPlayers) {
      if (id === myId) continue;
      const other = allPlayers[id];
      if (other.position) {
        sprites.push({
           type: 'player',
           x: other.position.x,
           y: other.position.y,
           team: other.team,
           isCarrier: lostLight?.carrierId === id
        });
      }
    }
  }

  if (lostLight && lostLight.isOnFloor && lostLight.position) {
    sprites.push({
       type: 'light',
       x: lostLight.position.x,
       y: lostLight.position.y
    });
  }

  if (gifts && gifts.length > 0) {
    gifts.forEach(g => {
      sprites.push({
         type: 'gift',
         x: g.position.x,
         y: g.position.y
      });
    });
  }

  // Sort sprites from far to close
  sprites.forEach(sprite => {
    sprite.distance = ((x - sprite.x) * (x - sprite.x) + (y - sprite.y) * (y - sprite.y));
  });
  sprites.sort((a, b) => b.distance - a.distance);

  // Project and draw sprites
  for (let i = 0; i < sprites.length; i++) {
    const sprite = sprites[i];
    const spriteX = sprite.x - x;
    const spriteY = sprite.y - y;

    const invDet = 1.0 / (planeX * dirY - dirX * planeY);
    const transformX = invDet * (dirY * spriteX - dirX * spriteY);
    const transformY = invDet * (-planeY * spriteX + planeX * spriteY);

    if (transformY > 0) {
      const spriteScreenX = Math.floor((width / 2) * (1 + transformX / transformY));
      const wallHeight = Math.abs(Math.floor(height / transformY));
      
      let spriteHeight, spriteWidth, spriteTopY, floorY;
      let color = [255, 255, 255]; // default

      if (sprite.type === 'player') {
         spriteHeight = wallHeight * 0.7; // 70% of wall height
         spriteWidth = wallHeight * 0.25; // 25% of wall width (skinny)
         floorY = height / 2 + wallHeight / 2;
         spriteTopY = floorY - spriteHeight;
         
         if (sprite.isCarrier) {
           color = [253, 224, 71]; // yellow-300 if carrying light
         } else {
           color = sprite.team === 'A' ? [6, 182, 212] : [236, 72, 153];
         }
      } else if (sprite.type === 'light') {
         // The Lost Light is a smaller floating orb
         spriteHeight = wallHeight * 0.2; 
         spriteWidth = wallHeight * 0.2; 
         floorY = height / 2 + wallHeight * 0.1; // Floats slightly above floor
         spriteTopY = floorY - spriteHeight;
         color = [250, 204, 21]; // yellow-400
      } else if (sprite.type === 'gift') {
         // Gift box
         spriteHeight = wallHeight * 0.2; 
         spriteWidth = wallHeight * 0.2; 
         floorY = height / 2 + wallHeight / 2; // Sits on floor
         spriteTopY = floorY - spriteHeight;
         color = [74, 222, 128]; // green-400
      }
      
      let drawStartY = Math.floor(spriteTopY);
      if (drawStartY < 0) drawStartY = 0;
      let drawEndY = Math.floor(floorY);
      if (drawEndY >= height) drawEndY = height - 1;

      let drawStartX = Math.floor(-spriteWidth / 2 + spriteScreenX);
      if (drawStartX < 0) drawStartX = 0;
      let drawEndX = Math.floor(spriteWidth / 2 + spriteScreenX);
      if (drawEndX >= width) drawEndX = width - 1;

      let maxDist = GAME_CONFIG.VISIBILITY_RADIUS;
      let intensity = 1.0 - (transformY / maxDist);
      if (intensity < 0) intensity = 0;
      if (intensity > 1) intensity = 1;
      intensity = Math.pow(intensity, 0.5);
      
      // If it's the light, it glows in the dark (override intensity)
      if (sprite.type === 'light' || sprite.isCarrier || sprite.type === 'gift') {
         intensity = Math.max(intensity, 0.8);
      }

      const r = Math.floor(color[0] * intensity);
      const g = Math.floor(color[1] * intensity);
      const b = Math.floor(color[2] * intensity);

      ctx.fillStyle = `rgb(${r},${g},${b})`;

      for (let stripe = drawStartX; stripe < drawEndX; stripe++) {
         // Z-Buffer check
         if (transformY < zBuffer[stripe]) {
            ctx.fillRect(stripe, drawStartY, 1, drawEndY - drawStartY);
         }
      }
    }
  }

  // -------------------------
  // MINIMAP RENDERING
  // -------------------------
  drawMinimap(ctx, maze, width, height, player, sprites, myPlayer);
}

function drawMinimap(ctx, maze, width, height, player, sprites, myPlayer) {
  const mapSize = 120;
  const padding = 15;
  const mapX = width - mapSize - padding;
  const mapY = padding;

  // Draw minimap background (dark, slight transparency)
  ctx.fillStyle = 'rgba(15, 23, 42, 0.7)'; // slate-900 with alpha
  ctx.fillRect(mapX, mapY, mapSize, mapSize);
  ctx.strokeStyle = 'rgba(51, 65, 85, 0.8)'; // slate-700
  ctx.lineWidth = 1;
  ctx.strokeRect(mapX, mapY, mapSize, mapSize);

  const tileSize = 8;
  const radius = GAME_CONFIG.VISIBILITY_RADIUS;
  const hasCompass = myPlayer?.activeEffects?.COMPASS; // true if COMPASS active

  const pX = Math.floor(player.x);
  const pY = Math.floor(player.y);

  // Center the minimap on the player
  const centerMapX = mapX + mapSize / 2;
  const centerMapY = mapY + mapSize / 2;

  // Draw visible grid
  for (let dy = -Math.ceil(radius); dy <= Math.ceil(radius); dy++) {
    for (let dx = -Math.ceil(radius); dx <= Math.ceil(radius); dx++) {
      const gridY = pY + dy;
      const gridX = pX + dx;
      
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > radius) continue;

      if (gridY >= 0 && gridY < maze.length && gridX >= 0 && gridX < maze[0].length) {
        const tile = maze[gridY][gridX];
        
        // Exact floating point offset for smooth movement
        const offsetX = (gridX - player.x) * tileSize;
        const offsetY = (gridY - player.y) * tileSize;

        const drawX = centerMapX + offsetX;
        const drawY = centerMapY + offsetY;

        // Skip drawing if outside minimap bounds
        if (drawX < mapX || drawX + tileSize > mapX + mapSize || drawY < mapY || drawY + tileSize > mapY + mapSize) {
           continue;
        }

        const alpha = Math.max(0, 1 - (dist / radius));

        if (tile === TILE.WALL) {
          ctx.fillStyle = `rgba(94, 114, 138, ${alpha})`;
          ctx.fillRect(drawX, drawY, tileSize + 0.5, tileSize + 0.5); // +0.5 to prevent sub-pixel gaps
        } else if (tile === TILE.ENTRANCE_A) {
          ctx.fillStyle = `rgba(34, 211, 238, ${alpha})`;
          ctx.fillRect(drawX, drawY, tileSize, tileSize);
        } else if (tile === TILE.ENTRANCE_B) {
          ctx.fillStyle = `rgba(244, 114, 182, ${alpha})`;
          ctx.fillRect(drawX, drawY, tileSize, tileSize);
        } else if (tile === TILE.EXIT) {
          ctx.fillStyle = `rgba(250, 204, 21, ${alpha})`;
          ctx.fillRect(drawX, drawY, tileSize, tileSize);
        }
      }
    }
  }

  // COMPASS powerup: Draw the exit if it exists
  if (hasCompass) {
     for (let y = 0; y < maze.length; y++) {
       for (let x = 0; x < maze[0].length; x++) {
          if (maze[y][x] === TILE.EXIT) {
             const dx = x - player.x;
             const dy = y - player.y;
             const drawX = centerMapX + dx * tileSize;
             const drawY = centerMapY + dy * tileSize;
             if (drawX >= mapX && drawX <= mapX + mapSize && drawY >= mapY && drawY <= mapY + mapSize) {
                ctx.fillStyle = 'rgba(250, 204, 21, 1)';
                ctx.fillRect(drawX, drawY, tileSize, tileSize);
             }
          }
       }
     }
  }

  // Draw sprites on the minimap
  sprites.forEach(sprite => {
    const dx = sprite.x - player.x;
    const dy = sprite.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // If compass is active, always show the light and the carrier
    const isCompassRevealed = hasCompass && (sprite.type === 'light' || sprite.isCarrier);
    
    if (dist <= radius || isCompassRevealed) {
      const drawX = centerMapX + dx * tileSize;
      const drawY = centerMapY + dy * tileSize;

      if (drawX >= mapX && drawX <= mapX + mapSize && drawY >= mapY && drawY <= mapY + mapSize) {
        ctx.beginPath();
        ctx.arc(drawX, drawY, tileSize / 2, 0, Math.PI * 2);
        
        if (sprite.type === 'player') {
          if (sprite.isCarrier) {
            ctx.fillStyle = '#fde047'; // yellow-300
          } else {
            ctx.fillStyle = sprite.team === 'A' ? '#06b6d4' : '#ec4899';
          }
        } else if (sprite.type === 'light') {
          ctx.fillStyle = '#facc15'; // yellow-400
        } else if (sprite.type === 'gift') {
          ctx.fillStyle = '#4ade80'; // green-400
        }
        ctx.fill();
      }
    }
  });

  // Draw myself in the center
  ctx.beginPath();
  ctx.arc(centerMapX, centerMapY, tileSize / 2.5, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff'; 
  ctx.fill();

  // Draw my direction line
  ctx.beginPath();
  ctx.moveTo(centerMapX, centerMapY);
  ctx.lineTo(centerMapX + player.dirX * tileSize * 1.5, centerMapY + player.dirY * tileSize * 1.5);
  ctx.strokeStyle = '#22d3ee'; // cyan-400
  ctx.lineWidth = 1.5;
  ctx.stroke();
}
