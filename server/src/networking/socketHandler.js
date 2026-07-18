export function registerSocketHandlers(io, roomManager) {
  io.on('connection', (socket) => {
    console.log(`[Socket Connected]: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`[Socket Disconnected]: ${socket.id}`);
      // Will be handled by roomManager in Module 13
    });

    // Add other event listeners here as modules progress
  });
}
