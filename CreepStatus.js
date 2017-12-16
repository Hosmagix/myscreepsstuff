let roles = ['builder', 'upgrader', 'outsider', 'sltrans', 'harvester', 'transporter', 'reserver', 'defender',
  'attacker', 'healer', 'specialbuilder', 'mineral', 'mineraltransporter', 'dismantler', 'keeper', 'gatherer', 'Specialdefender', 'looter' ]

function addRolesToRoom (room) {
  room.myCreeps = {}
  roles.forEach(key => { room.myCreeps[key] = [] })
}

exports.AddCreepStatusToRoomInfo = function () {
  Game.rooms.forEach((room) => {
    if (room.controller.my) {
      // I can only have creeps I own myself;
      addRolesToRoom(room)
    }
  })

  Game.creeps.forEach((creep) => {
    if (creep.ticksToLive > 100) {
      let home = creep.memory.home
      let room = Game.rooms[home]
      room.myCreeps[creep.memory.role].push(creep) // TODO add array in other for loop
    }
  })
}
