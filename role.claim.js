let roleClaim = {

  /** @param {Creep} creep **/
  run: function (creep) {
    if (creep.room.name === creep.memory.room) {
      // console.log ('target room');

      if (creep.memory.role === 'reserver') {
        // console.log('bla');
        if (creep.reserveController(creep.room.controller) === ERR_NOT_IN_RANGE) {
          creep.goTo(creep.room.controller.pos, 1, 3)
        }
      } else {
        if (creep.claimController(creep.room.controller) === ERR_NOT_IN_RANGE) {
          creep.goTo(creep.room.controller.pos, 1, 3)
        }
      }
    } else {
      let roompos = new RoomPosition(25, 25, creep.memory.room)
      let controllerroom = Game.rooms[creep.memory.room]
      if (controllerroom && controllerroom.controller) {
        roompos = controllerroom.controller.pos
      } else if (creep.memory.lasttarget && creep.memory.lasttarget.roomName === creep.memory.room) {
        roompos = new RoomPosition(creep.memory.lasttarget.x, creep.memory.lasttarget.y, creep.memory.lasttarget.roomName)
      }

      creep.goTo(roompos, 1, 3)
    }
    // find enemy room first
  }
}

module.exports = roleClaim
