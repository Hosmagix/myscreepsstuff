exports.handleTerminals = function (room) {
  if (Game.time % 10 === 2 && room.terminal && room.terminal.store) {
    var transitiondone = false
    //   console.log(JSON.stringify(room.terminal));
    Object.keys(room.terminal.store).forEach(function (key) {
      // key: the name of the object key
      let amount = room.terminal.store[key]
      if (amount < 1000 || transitiondone || key === RESOURCE_ENERGY) return
      if (room.memory.reaction && (room.memory.reaction.m1 === key || room.memory.reaction.m2 === key)) {
        return
      }

      if (Memory.requesting && Memory.requesting[key]) {
        let rooms = Memory.requesting[key]
        //  room.log('requesting rooms are: ' + rooms);
        let targetroom = null // only transfer up to 10k minerals
        let mineral = 9000
        for (let i in rooms) {
          let name = rooms[i]
          let roomi = Game.rooms[name]
          // console.log('roomi: ' + JSON.stringify(roomi));
          let minerals = roomi.terminal.store[key] || 0
          // console.log('minerals: ' + minerals);
          if (minerals < mineral && (name !== room.name)) {
            mineral = minerals
            targetroom = name
          }
          // room.log('name: ' + name + 'room.name' + room.name +'' + (name === room.name) );
          if (name === room.name) {
            // room.log('room: ' + name + 'is the same room -> therefore material is needed itself -> donnot send');
            minerals = -1
            targetroom = null
          }
        }
        // room.log('targetroom for ' + key + ' is: ' + targetroom);
        // Game.rooms[room_id]

        if (targetroom && !transitiondone && key !== RESOURCE_ENERGY) {
          let res = room.terminal.send(key, amount, targetroom)
          transitiondone = true
          room.log('transfering ' + amount + ' ' + key + ' to ' + targetroom + ': ' + res)
        }
      }
    })
    if (transitiondone) {
      return
    }
  }

  if (room.terminal && room.terminal.store.energy > 70000 && room.controller.level === 8 && Game.time % 50 === 0 && Memory.energytarget) {
    room.log(room.name + ': found level 8 room -> prepare sending energy away')
    let targetroom = Game.rooms[Memory.energytarget]
    if (targetroom.terminal && targetroom.terminal.store.energy < 150000) {
      let destination = Memory.energytarget
      let amount = 30000
      room.terminal.send('energy', amount, destination)
      transitiondone = true
      room.log('transfering ' + amount + ' energy to ' + destination)
    }
  }
}