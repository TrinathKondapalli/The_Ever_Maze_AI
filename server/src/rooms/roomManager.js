export class RoomManager {
  constructor() {
    this.rooms = new Map();
    this.socketToRoom = new Map();
  }

  getRoomCount() {
    return this.rooms.size;
  }

  getPlayerCount() {
    return this.socketToRoom.size;
  }

  // To be implemented in Module 13
  createRoom() {}
  joinRoom() {}
  leaveRoom() {}
}
