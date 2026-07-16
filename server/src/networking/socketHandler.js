const { EVENTS } = require('../constants/index.js');
const { RoomManager } = require('../rooms/roomManager.js');
const roomManager = new RoomManager();

function registerHandlers(io) {
  io.on('connection', (socket) => {
    if (process.env.DEBUG === 'true') {
      console.log(`[Socket Connected]: ${socket.id}`);
    }
    socket.emit(EVENTS.ROOM_ERROR, { message: 'Server ready' });

    socket.on(EVENTS.CREATE_ROOM, (data, callback) => {
      if (typeof callback === 'function') {
        callback({ success: false, error: 'Not implemented yet' });
      }
    });

    socket.on(EVENTS.JOIN_ROOM, (data, callback) => {
      if (typeof callback === 'function') {
        callback({ success: false, error: 'Not implemented yet' });
      }
    });

    socket.on('disconnect', () => {
      if (process.env.DEBUG === 'true') {
        console.log(`[Socket Disconnected]: ${socket.id}`);
      }
    });
  });
}
module.exports = { registerHandlers };
