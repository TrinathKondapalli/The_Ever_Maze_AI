import { io } from 'socket.io-client';

// Use '/' in production (Render) so it uses the same host,
// and in development, use the window.location.origin which will hit the Vite proxy
const URL = import.meta.env.PROD ? undefined : 'http://localhost:3001';

export const socket = io(URL, {
  autoConnect: false,
});

export default socket;
