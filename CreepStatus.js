let roles = ['builder', 'upgrader', 'outsider', 'sltrans', 'harvester', 'transporter', 'reserver', 'defender',
  'attacker', 'healer', 'specialbuilder', 'mineral', 'mineraltransporter', 'dismantler', 'keeper', 'gatherer', 'Specialdefender', 'looter' ]

function addRolesToRoom (room) {
  room.myCreeps = {}
  roles.forEach(key => { room.myCreeps[key] = [] })
}

exports.AddCreepStatusToRoomInfo = function () {
  for (let key in Game.rooms) {
    if (Game.rooms.hasOwnProperty(key)) {
      let room = Game.rooms[key]
      if (room.controller.my) {
        // I can only have creeps I own myself;
        addRolesToRoom(room)
      }
    }
  }

  for (let key in Game.creeps) {
    if (Game.rooms.hasOwnProperty(key)) {
      let creep = Game.creeps[key]
      if (creep.ticksToLive > 100) {
        let home = creep.memory.home
        let room = Game.rooms[home]
        room.myCreeps[creep.memory.role].push(creep) // TODO add array in other for loop
      }
    }
  }
}
