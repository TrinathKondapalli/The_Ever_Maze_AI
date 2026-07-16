import React, { useRef, useState, useEffect } from 'react';

export default function VirtualJoystick({ onMove }) {
  const joystickRef = useRef(null);
  const [active, setActive] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 }); // offset from center
  const maxDistance = 50; // Max radius the knob can move

  const handlePointerDown = (e) => {
    e.preventDefault();
    setActive(true);
    updateJoystick(e);
  };

  const handlePointerMove = (e) => {
    if (!active) return;
    e.preventDefault();
    updateJoystick(e);
  };

  const handlePointerUp = (e) => {
    e.preventDefault();
    setActive(false);
    setPosition({ x: 0, y: 0 });
    if (onMove) onMove({ x: 0, y: 0 });
  };

  const updateJoystick = (e) => {
    if (!joystickRef.current) return;
    
    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let dx = e.clientX - centerX;
    let dy = e.clientY - centerY;

    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > maxDistance) {
      dx = (dx / distance) * maxDistance;
      dy = (dy / distance) * maxDistance;
    }

    setPosition({ x: dx, y: dy });

    if (onMove) {
      // Normalize to -1 to 1 range
      onMove({
        x: dx / maxDistance,
        y: dy / maxDistance
      });
    }
  };

  useEffect(() => {
    if (active) {
      window.addEventListener('pointermove', handlePointerMove, { passive: false });
      window.addEventListener('pointerup', handlePointerUp, { passive: false });
      window.addEventListener('pointercancel', handlePointerUp, { passive: false });
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [active]);

  return (
    <div 
      ref={joystickRef}
      onPointerDown={handlePointerDown}
      className="w-32 h-32 bg-slate-800/60 border-2 border-slate-600/50 rounded-full flex items-center justify-center touch-none select-none relative"
      style={{ touchAction: 'none' }}
    >
      <div 
        className="w-16 h-16 bg-cyan-600/80 border-2 border-cyan-400 rounded-full shadow-lg absolute pointer-events-none"
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          transition: active ? 'none' : 'transform 0.2s ease-out'
        }}
      />
    </div>
  );
}
