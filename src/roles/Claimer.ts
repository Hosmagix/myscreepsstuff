import { ClaimerCreep } from "../interfaces/MyCreep";
import { BaseRole } from "./BaseRole";

export class Claimer extends BaseRole<ClaimerCreep> {
  public constructor(creep: ClaimerCreep) {
    super(creep);
  }

  public run(): void {
    if (this.creep.room.name === this.creep.memory.room) {
      // console.log ('target room');

      if (this.creep.memory.role === "reserver") {
        // console.log('bla');
        if (this.creep.reserveController(this.creep.room.controller!) === ERR_NOT_IN_RANGE) {
          this.goTo(this.creep.room.controller!.pos);
        }
      } else {
        if (this.creep.claimController(this.creep.room.controller!) === ERR_NOT_IN_RANGE) {
          this.goTo(this.creep.room.controller!.pos);
        }
      }
    } else {
      let roomPosition = new RoomPosition(25, 25, this.creep.memory.room);
      const controllerRoom = Game.rooms[this.creep.memory.room];
      if (controllerRoom && controllerRoom.controller) {
        roomPosition = controllerRoom.controller.pos;
      } else if (this.creep.memory.lasttarget && this.creep.memory.lasttarget.roomName === this.creep.memory.room) {
        roomPosition = new RoomPosition(
          this.creep.memory.lasttarget.x,
          this.creep.memory.lasttarget.y,
          this.creep.memory.lasttarget.roomName
        );
      }

      this.goTo(roomPosition);
    }
    // find enemy room first
  }
}
