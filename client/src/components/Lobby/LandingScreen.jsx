import React, { useState, useEffect } from 'react';
import socket from '../../socket/socket.js';
import { useGameStore } from '../../hooks/useGameStore.js';
import { gameStore } from '../../store/gameStore.js';
import { EVENTS, PLAYER_COLORS } from '../../constants/index.js';
import LandingPage from '../Landing/LandingPage';

export default function LandingScreen() {
  const { preferredColor } = useGameStore();
  const [name, setName] = useState(localStorage.getItem('playerName') || '');
  const [colorIndex, setColorIndex] = useState(
    Math.max(0, PLAYER_COLORS.indexOf(preferredColor))
  );
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    localStorage.setItem('preferredColor', PLAYER_COLORS[colorIndex]);
    gameStore.setState({ preferredColor: PLAYER_COLORS[colorIndex] });
  }, [colorIndex]);

  useEffect(() => {
    localStorage.setItem('playerName', name);
  }, [name]);

  const handleCreatePrivate = () => {
    if (name.length < 2) return setError('Name must be at least 2 characters');
    setError(null);
    socket.emit(EVENTS.CREATE_ROOM, { playerName: name, color: PLAYER_COLORS[colorIndex], settings: {} }, (res) => {
      if (res.success) {
        gameStore.setState({
          roomCode: res.roomCode,
          room: res.room,
          player: res.player,
          phase: 'lobby'
        });
      } else {
        setError(res.error);
      }
    });
  };

  const handlePlay = () => {
    if (name.length < 2) return setError('Name must be at least 2 characters');
    setError(null);
    setIsJoining(true);
    socket.emit('QUICK_JOIN', { playerName: name, color: PLAYER_COLORS[colorIndex] }, (res) => {
      if (res.success) {
        gameStore.setState({
          roomCode: res.roomCode,
          room: res.room,
          player: res.player,
          phase: 'lobby'
        });
      } else {
        setError(res.error);
        setIsJoining(false);
      }
    });
  };

  return (
    <LandingPage 
      playerName={name}
      onNameChange={setName}
      selectedColorIndex={colorIndex}
      onColorSelect={setColorIndex}
      onPlay={handlePlay}
      onCreateRoom={handleCreatePrivate}
      isJoining={isJoining}
      error={error}
    />
  );
}

