let roleHealer = {

  /** @param {Creep} creep **/
  run: function (creep) {
    if (creep.memory.boost) {
      for (let i in creep.body) {
        let part = creep.body[i]
        if (!part.boost && part.type === HEAL) {
          this.boost(creep, RESOURCE_LEMERGIUM_OXIDE)
          return
        }
      }

      creep.memory.boost = false
    }

    let actiondone = this.act(creep)
    if (actiondone) {
      return
    }
    if (!creep.room.controller || (creep.room.controller && !creep.room.controller.safeMode)) {
      if (creep.room.name === creep.memory.room) {
        actiondone = this.afteract(creep)
      }
      if (actiondone) {
        return
      }
    }

    if (creep.memory.gatheringpoint) {
      let pos = new RoomPosition(creep.memory.gatheringpoint.x, creep.memory.gatheringpoint.y, creep.memory.gatheringpoint.roomName)
      creep.goTo(pos)
      // var res = creep.moveTo(pos, {ignoreCreeps: true});
      return
    }

    if (creep.memory.room !== creep.room.name) {
      let roompos = new RoomPosition(25, 25, creep.memory.room)
      if (creep.memory.lasttarget && creep.memory.lasttarget.roomName === creep.memory.room) {
        roompos = new RoomPosition(creep.memory.lasttarget.x, creep.memory.lasttarget.y, creep.memory.lasttarget.roomName)
      }
      creep.goTo(roompos)

      return
    }

    this.afteract(creep)
  },

  act: function (creep) {
    let healpower = creep.getActiveBodyparts(HEAL) * 12
    // console.log('healpower');
    // heal prio
    var target = creep.pos.findClosestByRange(FIND_MY_CREEPS, {
      filter: function (mc) { return mc.hits + healpower * 5 <= mc.hitsMax }
    })

    // console.log(JSON.stringify(target));
    if (target) {
      if (creep.heal(target) === ERR_NOT_IN_RANGE) {
        creep.rangedHeal(target)
        creep.moveTo(target, { reusePath: 0 })
      } else {
        this.afteract(creep)
      }
      return true
    }

    // heal all
    var target = creep.pos.findClosestByRange(FIND_MY_CREEPS, {
      filter: function (mc) { return mc.hits < mc.hitsMax }
    })

    // console.log(JSON.stringify(target));
    if (target) {
      if (creep.heal(target) === ERR_NOT_IN_RANGE) {
        creep.rangedHeal(target)
        creep.moveTo(target, { reusePath: 0 })
      } else {
        this.afteract(creep)
      }
      return true
    }
  },

  afteract: function (creep) {
    let healpower = creep.getActiveBodyparts(HEAL) * 12
    // heal prio
    var target = creep.pos.findClosestByRange(FIND_MY_CREEPS, {
      filter: function (mc) { return mc.hits + healpower <= mc.hitsMax }
    })

    if (target) {
      creep.moveTo(target, { reusePath: 0 })
      return true
    }

    /*
        var towers = creep.room.find(FIND_HOSTILE_STRUCTURES,{
            filter: (structure) => {
                return (structure.structureType === STRUCTURE_TOWER);
            }
        }); */

    var target = creep.pos.findClosestByRange(FIND_MY_CREEPS, {
      filter: function (mc) { return mc.memory.role === 'attacker' || mc.memory.role === 'dismantler' }
    })
    if (target !== null) {
      creep.moveTo(target, { reusePath: 0 })
      // console.log('move after');
      return true
    }
    return false
  },

  boost: function (creep, mineraltype) {
    let lab = creep.pos.findClosestByRange(FIND_MY_STRUCTURES, {
      filter: function (lab) {
        return lab.mineralType === mineraltype && lab.mineralAmount > 100
      }
    })
    if (lab) {
      creep.moveTo(lab)
      lab.boostCreep(creep)
    }
  }
}

module.exports = roleHealer
