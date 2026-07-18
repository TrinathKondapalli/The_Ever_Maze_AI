import { io } from 'socket.io-client';

// Auto-connect is false. We will explicitly connect when needed.
export const socket = io(import.meta.env.VITE_SERVER_URL || 'http://localhost:3001', {
  autoConnect: false,
});

export default socket;
