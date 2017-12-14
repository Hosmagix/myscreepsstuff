let utils = {}
utils.findClosestRoom = function (start, minlevel) {
  let startroom = start.roomName

  let startcords = startroom.substr(1).replace('N', ',').replace('S', ',').split(',')
  // console.log('cords: ' + JSON.stringify(startcords));
  let center = (Number(startcords[0]) % 10 > 3 && Number(startcords[0]) % 10 < 7 && Number(startcords[1]) % 10 > 3 && Number(startcords[1]) % 10 < 7)
  console.log('center: ' + center)

  let goals = []
  for (let spawn in Game.spawns) {
    goals.push({ pos: Game.spawns[spawn].pos, range: 2 })
  }
  let res = PathFinder.search(start, goals, {
    plainCost: 1,
    swampCost: 5,
    maxCost: 1000,
    maxOps: 10000,
    roomCallback: function (roomName) {
      // console.log('roomcallback: ' + roomName);
      let room = Game.rooms[roomName]

      // only ignore center rooms if start room isn't in the center
      let cords = roomName.substr(1).replace('N', ',').replace('S', ',').split(',')
      console.log('cords: ' + JSON.stringify(cords))
      if (!center && Number(cords[0]) % 10 > 3 && Number(cords[0]) % 10 < 7 && Number(cords[1]) % 10 > 3 && Number(cords[1]) % 10 < 7) {
        // console.log('should be a central room -> return false');
        return false
      }

      // In this example `room` will always exist, but since PathFinder
      // supports searches which span multiple rooms you should be careful!
      if (!room) return new PathFinder.CostMatrix()

      let costs = new PathFinder.CostMatrix()

      room.find(FIND_STRUCTURES).forEach(function (structure) {
        if (structure.structureType === STRUCTURE_ROAD) {
          // Favor roads over plain tiles
          costs.set(structure.pos.x, structure.pos.y, 1)
        } else if (structure.structureType !== STRUCTURE_CONTAINER &&
          (structure.structureType !== STRUCTURE_RAMPART ||
            !structure.my)) {
          // Can't walk through non-walkable buildings
          costs.set(structure.pos.x, structure.pos.y, 0xff)
        }
      })

      return costs
    }
  })
  console.log('pathfinding cost: ' + res.cost)
  console.log('incomplete: ' + res.incomplete)
  // console.log('pathresult result: ' + res.path[res.path.length - 1].roomName);
  // console.log('details: ' + JSON.stringify(res.path));
  if (res.incomplete) {
    return false
  }
  return res.path[res.path.length - 1].roomName
}

module.exports = utils
