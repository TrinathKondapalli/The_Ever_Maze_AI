import React, { useEffect, useRef } from 'react';
import { TILE } from '../../constants/index.js';

export default function Minimap({ maze, myPlayer, players, lostLight, myId }) {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    if (!maze || !myPlayer || !myPlayer.position || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Size of the minimap canvas
    const size = 150;
    canvas.width = size;
    canvas.height = size;
    
    // Clear canvas
    ctx.clearRect(0, 0, size, size);
    
    // Circular clipping
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
    ctx.clip();
    
    // Fill background (fog)
    ctx.fillStyle = '#020617'; // slate-950
    ctx.fillRect(0, 0, size, size);
    
    const tileSize = 12;
    const px = myPlayer.position.x;
    const py = myPlayer.position.y;
    
    // Radius of visibility in tiles
    const hasCompass = myPlayer.activeEffects?.COMPASS;
    const radius = hasCompass ? 15 : 6;
    
    // We want the player to be exactly in the center of the canvas.
    // So map coordinate (px, py) maps to canvas (size/2, size/2)
    const offsetX = size / 2 - px * tileSize;
    const offsetY = size / 2 - py * tileSize;
    
    // Draw Maze Cells within radius
    const startX = Math.max(0, Math.floor(px - radius));
    const endX = Math.min(maze[0].length - 1, Math.ceil(px + radius));
    const startY = Math.max(0, Math.floor(py - radius));
    const endY = Math.min(maze.length - 1, Math.ceil(py + radius));
    
    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        // Distance check for circular fog of war
        const dist = Math.sqrt(Math.pow(x + 0.5 - px, 2) + Math.pow(y + 0.5 - py, 2));
        if (dist > radius) continue;
        
        const cell = maze[y][x];
        const screenX = x * tileSize + offsetX;
        const screenY = y * tileSize + offsetY;
        
        // Draw tile
        if (cell === TILE.WALL) {
          ctx.fillStyle = '#334155'; // slate-700
          ctx.fillRect(screenX, screenY, tileSize + 0.5, tileSize + 0.5);
        } else if (cell === TILE.EXIT) {
          ctx.fillStyle = '#fbbf24'; // amber-400
          ctx.fillRect(screenX, screenY, tileSize + 0.5, tileSize + 0.5);
        } else {
          ctx.fillStyle = '#0f172a'; // slate-900
          ctx.fillRect(screenX, screenY, tileSize + 0.5, tileSize + 0.5);
        }
        
        // Add distance-based shadow (darken edge tiles)
        if (dist > radius - 2) {
           const alpha = (dist - (radius - 2)) / 2;
           ctx.fillStyle = `rgba(2, 6, 23, ${Math.min(1, alpha)})`;
           ctx.fillRect(screenX, screenY, tileSize + 0.5, tileSize + 0.5);
        }
      }
    }
    
    // Draw Lost Light if it's within radius
    if (lostLight?.isOnFloor && lostLight.position) {
       const dist = Math.sqrt(Math.pow(lostLight.position.x - px, 2) + Math.pow(lostLight.position.y - py, 2));
       if (dist <= radius) {
          ctx.fillStyle = '#fef08a'; // yellow-200
          ctx.beginPath();
          ctx.arc(
             lostLight.position.x * tileSize + offsetX, 
             lostLight.position.y * tileSize + offsetY, 
             3, 0, Math.PI * 2
          );
          ctx.fill();
       }
    }
    
    // Draw other players if they are on same team and within radius
    for (const sid in players) {
       if (sid === myId) continue;
       const p = players[sid];
       if (p.position && p.team === myPlayer.team) {
          const dist = Math.sqrt(Math.pow(p.position.x - px, 2) + Math.pow(p.position.y - py, 2));
          if (dist <= radius) {
             ctx.fillStyle = '#22d3ee'; // cyan-400
             ctx.beginPath();
             ctx.arc(
                p.position.x * tileSize + offsetX, 
                p.position.y * tileSize + offsetY, 
                2.5, 0, Math.PI * 2
             );
             ctx.fill();
          }
       }
    }
    
    // Draw My Player (Arrow pointing in direction)
    const pDirX = myPlayer.position.dirX;
    const pDirY = myPlayer.position.dirY;
    
    ctx.translate(size / 2, size / 2);
    // Calculate angle from dirX, dirY
    const angle = Math.atan2(pDirY, pDirX);
    ctx.rotate(angle);
    
    ctx.fillStyle = '#22c55e'; // green-500
    ctx.beginPath();
    ctx.moveTo(4, 0); // Tip
    ctx.lineTo(-4, 3); // Bottom right
    ctx.lineTo(-2, 0); // Back center
    ctx.lineTo(-4, -3); // Bottom left
    ctx.closePath();
    ctx.fill();
    
    // Reset transform and clip
    ctx.restore();
    
    // Draw border ring
    ctx.strokeStyle = '#334155'; // slate-700
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
    ctx.stroke();
    
  }, [maze, myPlayer, players, lostLight]);

  return (
    <div className="relative rounded-full shadow-[0_0_15px_rgba(0,0,0,0.8)] overflow-hidden bg-slate-950 border border-slate-900 pointer-events-none">
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}
