let roles = ['builder', 'upgrader', 'outsider', 'sltrans', 'keepTrans', 'harvester', 'dumper', 'transporter', 'reserver',
  'defender', 'attacker', 'healer', 'specialbuilder', 'mineral', 'mineraltransporter', 'dismantler', 'keeper',
  'gatherer', 'Specialdefender', 'looter', 'claim', 'supporter' ];

function addRolesToRoom (room) {
  room.myCreeps = {};
  roles.forEach(key => { room.myCreeps[key] = []; });
}

exports.AddCreepStatusToRoomInfo = function () {
  for (let key in Game.rooms) {
    if (Game.rooms.hasOwnProperty(key)) {
      let room = Game.rooms[key];
      if (room.controller && room.controller.my) {
        // I can only have creeps I own myself;
        addRolesToRoom(room);
      }
    }
  }

  for (let key in Game.creeps) {
    if (Game.creeps.hasOwnProperty(key)) {
      let creep = Game.creeps[key];
      if (creep.ticksToLive > 100 || creep.spawning) {
        let home = creep.memory.home;
        let room = Game.rooms[home];
        if (room) {
          room.myCreeps[creep.memory.role].push(creep); // TODO add array in other for loop
        }

        // console.log(JSON.stringify(room.myCreeps));
      }
    }
  }
};
