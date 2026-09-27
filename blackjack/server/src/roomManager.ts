import { Room } from "./room";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid confusion
const ROOM_IDLE_MS = 6 * 60 * 60 * 1000; // sweep empty rooms after 6h

export class RoomManager {
  private rooms = new Map<string, Room>();

  private randomCode(): string {
    let code = "";
    for (let i = 0; i < 5; i++) {
      code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    }
    return code;
  }

  create(): Room {
    let code = this.randomCode();
    while (this.rooms.has(code)) code = this.randomCode();
    const room = new Room(code);
    this.rooms.set(code, room);
    return room;
  }

  get(code: string): Room | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  sweep() {
    for (const [code, room] of this.rooms) {
      if (room.isEmpty && room.idleMs > ROOM_IDLE_MS) {
        this.rooms.delete(code);
      }
    }
  }
}
