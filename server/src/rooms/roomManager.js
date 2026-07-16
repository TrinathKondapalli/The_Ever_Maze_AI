class RoomManager {
  constructor() {
    this.rooms = new Map();
  }
  createRoom() { return null; }
  joinRoom() { return null; }
  leaveRoom() { return null; }
  getRoom() { return null; }
  getRoomCount() { return this.rooms.size; }
  getPlayerCount() { return 0; }
}
module.exports = { RoomManager };
