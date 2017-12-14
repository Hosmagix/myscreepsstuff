exports.overridePrototypes = function () {
  Creep.prototype.log = function (message) {
    console.log(this.name + '/' + this.memory.role + ':' + this.room.name + ' : ' + message)
  }

  Creep.prototype.initmaxcarry = function () {
    if (this.memory.maxcarry) {
      // console.log('maxcarry was already inizialized return');
      return
    }
    var carry = this.getActiveBodyparts(CARRY)
    if (carry > 0) {
      var maxweight = this.getActiveBodyparts(MOVE)
      var remainingweight = maxweight - this.getActiveBodyparts(WORK)
      var maxcarry = remainingweight * 50
      // console.log(this.name + '/' + this.memory.role + 'has a maxcarry of' + maxcarry);
      this.memory.maxcarry = maxcarry
    } else {
      // console.log('creep has no carry -> should be fine');
      this.memory.maxcarry = 1
    }
  }

  Room.prototype.log = function (message) {
    console.log(this.name + ' : ' + message)
  }

  Room.prototype.getCostmatrix = function (plaincost) {
    if (this.matrix1) {
      // console.log('found old matrix -> return it');
      return this.matrix1
    } else if (this.memory.storedmatrix && this.memory.storedmatrix.timevalid > Game.time) {
      this.matrix1 = PathFinder.CostMatrix.deserialize(this.memory.storedmatrix.matrix)
      // this.log('found stored costmatrix');
      return this.matrix1.clone()
    } else {
      // console.log('creating new costmatrix ');
      let costs = new PathFinder.CostMatrix()

      this.find(FIND_STRUCTURES).forEach(function (structure) {
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

      this.find(FIND_CONSTRUCTION_SITES).forEach(function(construcitonsite){
        if (construcitonsite.structureType !== STRUCTURE_ROAD){
          costs.set(construcitonsite.pos.x, construcitonsite.pos.y, 0xff);
        }
      })

      this.matrix1 = costs
      var storedmatrix = {}
      storedmatrix.timevalid = Game.time + 10
      storedmatrix.matrix = costs.serialize()
      this.memory.storedmatrix = storedmatrix

      return costs.clone()
    }
  }

  Creep.prototype.boost = function (mineraltype) {
    var lab = this.pos.findClosestByRange(FIND_MY_STRUCTURES, {
      filter: function (lab) {
        return lab.mineralType === mineraltype && lab.mineralAmount > 100
      }
    })
    if (lab) {
      this.moveTo(lab)
      lab.boostCreep(this)
      return true
    }
    return false
  }

  Creep.prototype.goTo = function (roompos) {
    // console.log('goto called');
    var plaincost = 1
    var swampcost = 5

    if (!roompos) {
      return false
    }
    if (this.pos.isNearTo(roompos)) {
      // check if its empty TODO

      var terrain = roompos.lookFor(LOOK_TERRAIN)
      if (terrain.length > 0 && terrain[0] === 'wall') {
        // this.log('terrain is wall: ' + JSON.stringify(terrain));
        return false
      }
      var structure = roompos.lookFor(LOOK_STRUCTURES).filter(function (stru) {
        return stru.structureType !== STRUCTURE_ROAD && stru.structureType !== STRUCTURE_RAMPART
      })
      if (structure.length > 0) {
        this.log('structure on it: ' + JSON.stringify(structure))
        return false
      }

      var direction = this.pos.getDirectionTo(roompos)
      this.move(direction)
      this.log('moving to roompos with direction ' + direction)
      return true
    }

    if (this.fatigue) {
      return ERR_TIRED
    }
    if (!this.memory.maxcarry) {
      this.initmaxcarry()
    }
    if (this.memory.maxcarry && this.memory.maxcarry !== 1) {
      var weight = _.sum(this.carry)
      if (weight > this.memory.maxcarry) {
        // console.log(this.name + '/' + this.memory.role +' weight is larger than carry -> use 2 and 10');
        plaincost = 2
        swampcost = 10
      }
    }

    // console.log('plaincost: ' + plaincost + 'swampcost: ' + swampcost);

    var lasttarget = this.memory.lasttarget

    if (lasttarget && this.memory.path && this.memory.path.length > 0 && lasttarget.x === roompos.x && lasttarget.y === roompos.y && lasttarget.roomName === roompos.roomName) {
      // console.log('old path found');
      var temppos = this.memory.path.shift()
      if (!temppos) {
        console.log('wrong tempos' + JSON.stringify(temppos))
        return this.moveTo(roompos)
      }
      var next = new RoomPosition(temppos.x, temppos.y, temppos.roomName)

      if (next && this.pos.isNearTo(next)) {
        var direction = this.pos.getDirectionTo(next)
        var result = this.move(direction)

        // var result = this.moveTo(next);
        if (result === OK) {
          return OK
        }
      }
    }

    var creep = this
    var range = 1
    if (this.pos.roomName !== roompos.roomName) {
      // this.log('walking to other room -> use dist 2');
      range = 2
    }

    var res = PathFinder.search(this.pos, { pos: roompos, range: range }, {
      plainCost: plaincost,
      swampCost: swampcost,
      maxCost: 400,
      maxOps: 4000,
      // serialize: true,
      roomCallback: function (roomName) {
        let room = Game.rooms[roomName]

        if (!room) return new PathFinder.CostMatrix()

        var costs = room.getCostmatrix()

        if (roomName === creep.pos.roomName) {
          // console.log('bla');
          creep.pos.findInRange(FIND_CREEPS, 4).forEach(function (oc) {
            costs.set(oc.pos.x, oc.pos.y, 0xff)
            // console.log('bladoof');
          })
        }

        return costs
      }
    })

    // var serializedpath = this.room.serializePath(res.path);
    // this.log('serialized path: ' + serializedpath);
    // this.log('serialized path: ' + res.path);

    this.memory.path = res.path

    this.memory.lasttarget = roompos
    if (res.path.length === 0) {
      this.log('no path found: targetposition was: ' + JSON.stringify(roompos) + ' creeppos was: ' + JSON.stringify(this.pos))
      return ERR_NO_PATH
    }
    if (this.memory.role === 'looter') {
      this.log(JSON.stringify(res))
    }
    if (res.incomplete) {
      this.log('res was incomplete: ' + JSON.stringify(res))
    }

    // console.log('res.path: '+ JSON.stringify(res));
    var nextsquare = this.memory.path.shift()
    var direction = this.pos.getDirectionTo(nextsquare)
    this.move(direction)
    var result = this.moveTo(nextsquare)
    // console.log(this.name + ' creepprototype: move to room with result:' + result);

    if (result !== OK) {
      this.log('targetposition was: ' + JSON.stringify(nextsquare) + ' creeppos was: ' + JSON.stringify(this.pos) + 'result: ' + result)
      // this.log('path:' + JSON.stringify(res.path));
    }

    return result
  }
}
