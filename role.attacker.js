var roleAttacker = {

  act: function (creep) {
    // console.log('roleAttacker act called');
    if (creep.memory.ranged) {
      var result = this.ranged_act(creep)
      this.afteract(creep)
      return result
    }

    var priorityTargets = []

    for (var flagN in Game.flags) {
      var flag = Game.flags[flagN]
      if (flag.color === COLOR_PURPLE && creep.room.name === flag.pos.roomName) {
        var targets = flag.pos.lookFor(LOOK_STRUCTURES, {
          filter: {function (s) { return s.structureType !== STRUCTURE_ROAD }}
        })
        if (targets.length > 0) {
          priorityTargets.push(targets[0])
        }
      }
    }

    var target = creep.pos.findClosestByRange(priorityTargets)
    if (target !== null) {
      if (creep.attack(target) !== OK) {
        if (creep.moveTo(target, {reusePath: 0}) == OK) {
          creep.attack(target)
        }
      }
      return true
    }

    // adjacent creeps
    var targets = creep.room.find(FIND_HOSTILE_CREEPS).filter(function (hc) {
      var structures = hc.pos.lookFor(LOOK_STRUCTURES, {
        filter: {function (s) { return s.structureType !== STRUCTURE_ROAD }}
      })
      return structures.length === 0
    })
    if (creep.memory.ignoreneutrals) {
      targets = targets.filter(function (hc) {
        return (creep.pos.inRangeTo(hc, 1))
      })
    }

    if (targets.length > 0) {
      var target = creep.pos.findClosestByRange(targets)
      if (creep.attack(target) !== OK) {
        if (creep.moveTo(target, {reusePath: 0}) == OK) {
          creep.attack(target)
        }
      }
      return true
    }

    // offensive creeps
    var targets = creep.room.find(FIND_HOSTILE_CREEPS).filter(function (hc) {
      var structures = hc.pos.lookFor(LOOK_STRUCTURES, {
        filter: {function (s) { return s.structureType !== STRUCTURE_ROAD }}
      })
      return structures.length === 0
    })
    if (creep.memory.ignoreneutrals) {
      targets = targets.filter(function (hc) {
        return (hc.owner.username !== 'Source Keeper' || creep.pos.inRangeTo(hc, 4)) && (hc.getActiveBodyparts(ATTACK) > 0 || hc.getActiveBodyparts(RANGED_ATTACK > 0) || hc.getActiveBodyparts(HEAL) > 0)
      })
    }

    var towers = creep.room.find(FIND_HOSTILE_STRUCTURES, {
      filter: (structure) => {
        return (structure.structureType === STRUCTURE_TOWER)
      }
    })

    var creepsandtowers = targets.concat(towers)

    if (creepsandtowers.length > 0) {
      var target = creep.pos.findClosestByRange(creepsandtowers)
      if (creep.attack(target) !== OK) {
        if (creep.moveTo(target, {reusePath: 0}) == OK) {
          creep.attack(target)
        }
      }
      return true
    }

    // normal creeps
    var targets = creep.room.find(FIND_HOSTILE_CREEPS).filter(function (hc) {
      var structures = hc.pos.lookFor(LOOK_STRUCTURES, {
        filter: {function (s) { return s.structureType !== STRUCTURE_ROAD }}
      })
      return structures.length === 0
    })
    if (creep.memory.ignoreneutrals) {
      targets = targets.filter(function (hc) {
        return (hc.owner.username !== 'Source Keeper' || creep.pos.inRangeTo(hc, 4))
      })
    }
    var structures = creep.room.find(FIND_HOSTILE_STRUCTURES, {
      filter: (structure) => {
        return (structure.structureType !== STRUCTURE_CONTROLLER && structure.structureType !== STRUCTURE_RAMPART && structure.structureType !== STRUCTURE_STORAGE && structure.structureType !== STRUCTURE_TERMINAL && structure.structureType !== STRUCTURE_KEEPER_LAIR)
      }
    })
    var both = targets.concat(structures)
    // var both = structures;
    if (both.length > 0) {
      var target = creep.pos.findClosestByRange(both)
      if (creep.attack(target) !== OK) {
        if (creep.moveTo(target, {reusePath: 0}) == OK) {
          creep.attack(target)
        }
      }
      return true
    }
    /*

        var targets = creep.room.find(FIND_HOSTILE_STRUCTURES,{
            filter: (structure) => {
                return (structure.structureType !== STRUCTURE_CONTROLLER && structure.structureType !== STRUCTURE_KEEPER_LAIR);

            }
        });

        if (targets.length > 0) {
            // console.log('hi');
            var target = creep.pos.findClosestByRange(targets);
            if(creep.attack(target )!== OK){
                if (creep.moveTo(target,{reusePath: 0}) == OK){
                    creep.attack(target);
                }

            }
            return true;
        } */

    /* var targets = creep.room.find(FIND_HOSTILE_CONSTRUCTION_SITES);

        if (targets.length > 0) {
            var target = creep.pos.findClosestByRange(targets);
            creep.moveTo(target,{reusePath: 0});

            return true;
        } */

    // damaged

    if (creep.hits < creep.hitsMax) {
      // console.log('creep is damaged');

      if (creep.memory.home && creep.memory.home !== creep.room.name) {
        // console.log('creep is outside -> go home');
        var homeroom = Game.rooms[creep.memory.home]
        var exitDir = creep.room.findExitTo(homeroom)
        var exit = creep.pos.findClosestByRange(exitDir)
        creep.moveTo(exit)
        return
      } else {
        // console.log('creep is at home');
        creep.moveTo(creep.room.controller)
      }
      return true
    }

    return false
  },

  ranged_act: function (creep) {
    // console.log('rangedact called')
    // set safepoint
    if (!creep.memory.safepoint || creep.memory.safepoint.roomName !== creep.room.name) { // && creep.pos.x > 0 && creep.pos.y > 0 && creep.pos.x < 49 && creep.pos.y < 49
      // console.log('creep just enered other room -> set safepoint');
      if (creep.room.name === creep.memory.home) {
        // console.log('creep is in homeroom');
        // set roomcontroller as default safepoint
        creep.memory.safepoint = creep.room.controller.pos
      } else {
        // console.log('creep is in other room');
        creep.memory.safepoint = creep.pos
      }
    }

    var targets = creep.pos.findInRange(FIND_HOSTILE_CREEPS, 2).filter(function (hc) {
      return hc.getActiveBodyparts(ATTACK) > 0
    })
    if (targets.length > 0 && creep.memory.role !== 'attacker') {
      var dmg = 0
      targets.forEach(function (hc) {
        var distance = creep.pos.getRangeTo(hc)
        if (distance === 1) {
          dmg += 10
        } else if (distance === 2) {
          dmg += 4
        } else if (distance === 3) {
          dmg += 1
        } else {
          console.log('Warning: distance is: ' + distance + 'but should be smaller than 3')
        }
      })
      /* if (dmg >= 10){
                console.log('dmg ist: ' + dmg);
                creep.rangedMassAttack();
            } else {
                creep.rangedAttack(target);
            } */

      if ((creep.pos.x === 49 || creep.pos.y === 49 || creep.pos.x === 0 || creep.pos.y === 0) && creep.hits > creep.hitsMax * 0.7) {
        console.log('creep is at border -> move out')
        var center = new RoomPosition(25, 25, creep.room.name)
        creep.moveTo(center)
        if (dmg >= 10) {
          console.log('dmg ist: ' + dmg)
          creep.rangedMassAttack()
        } else {
          creep.rangedAttack(target)
        }
      } else {
        var roompos = new RoomPosition(creep.memory.safepoint.x, creep.memory.safepoint.y, creep.room.name)
        creep.moveTo(roompos, {reusePath: 0})
        if (dmg >= 10) {
          console.log('dmg ist: ' + dmg)
          creep.rangedMassAttack()
        } else {
          creep.rangedAttack(target)
        }
      }

      return true
    }
    var targets = creep.pos.findInRange(FIND_HOSTILE_CREEPS, 3)
    if (creep.memory.role === 'attacker') {
      var newtargets = targets.filter(function (hc) {
        var structures = hc.pos.lookFor(LOOK_STRUCTURES, {
          filter: {function (s) { return s.structureType !== STRUCTURE_ROAD }}
        })
        return structures.length === 0
      })

      if (newtargets.length > 0) {
        var target = creep.pos.findClosestByRange(newtargets)

        var dmg = 0
        newtargets.forEach(function (hc) {
          var distance = creep.pos.getRangeTo(hc)
          if (distance === 1) {
            dmg += 10
          } else if (distance === 2) {
            dmg += 4
          } else if (distance === 3) {
            dmg += 1
          } else {
            console.log('Warning: distance is: ' + distance + 'but should be smaller than 3')
          }
        })
        if (dmg >= 10) {
          console.log('dmg ist: ' + dmg)
          creep.rangedMassAttack()
        } else {
          creep.rangedAttack(target)
        }

        if (creep.pos.x === 49 || creep.pos.y === 49 || creep.pos.x === 0 || creep.pos.y === 0) {
          // console.log('creep is at border -> move out');
          var center = new RoomPosition(25, 25, creep.room.name)
          creep.moveTo(center)
        } else {
          // console.log('creep has stil enough health -> fight');
          creep.moveTo(target, {reusePath: 0})
        }
        return true
      }
    }

    if (targets.length > 0) {
      var healers = targets.filter(function (hc) {
        return hc.getActiveBodyparts(HEAL) > 0
      })
      var target = creep.pos.findClosestByRange(targets)
      // console.log('hostile creeps in range 3 -> do nothing')
      if (targets.length > 1 && healers.length >= 1) {
        creep.rangedMassAttack()
      } else {
        var dmg = 0
        targets.forEach(function (hc) {
          var distance = creep.pos.getRangeTo(hc)
          if (distance === 1) {
            dmg += 10
          } else if (distance === 2) {
            dmg += 4
          } else if (distance === 3) {
            dmg += 1
          } else {
            console.log('Warning: distance is: ' + distance + 'but should be smaller than 3')
          }
        })
        if (dmg >= 10) {
          console.log('dmg ist: ' + dmg)
          creep.rangedMassAttack()
        } else {
          creep.rangedAttack(target)
        }
      }
      if (creep.pos.x === 49 || creep.pos.y === 49 || creep.pos.x === 0 || creep.pos.y === 0) {
        console.log('creep is at border -> move out')
        var center = new RoomPosition(25, 25, creep.room.name)
        creep.moveTo(center)
      } else if (creep.hits > creep.hitsMax * 0.8) {
        console.log('creep has stil enough health -> fight')
        creep.moveTo(target, {reusePath: 0})
      } else {
        var roompos = new RoomPosition(creep.memory.safepoint.x, creep.memory.safepoint.y, creep.room.name)
        creep.moveTo(roompos, {reusePath: 0})
      }
      return true
    }

    // damaged

    if (creep.hits < creep.hitsMax * 0.75) {
      console.log(creep.name + ' is damaged: ' + creep.hits + '/' + creep.hitsMax)

      if (creep.memory.home && creep.memory.home !== creep.room.name) {
        // console.log('creep is outside -> go home');
        var homeroom = Game.rooms[creep.memory.home]
        var exitDir = creep.room.findExitTo(homeroom)
        var exit = creep.pos.findClosestByRange(exitDir)
        creep.moveTo(exit)
        return
      } else {
        // console.log('creep is at home');
        creep.moveTo(creep.room.controller)
      }
      return true
    }

    var priorityTargets = []

    for (var flagN in Game.flags) {
      var flag = Game.flags[flagN]
      if (flag.color === COLOR_PURPLE && creep.room.name === flag.pos.roomName) {
        var targets = flag.pos.lookFor(LOOK_STRUCTURES, {
          filter: {function (s) { return s.structureType !== STRUCTURE_ROAD }}
        })
        if (targets.length > 0) {
          priorityTargets.push(targets[0])
        }
      }
    }

    // offensive creeps
    var targets = creep.room.find(FIND_HOSTILE_CREEPS)
    if (creep.memory.ignoreneutrals) {
      targets = targets.filter(function (hc) {
        return (hc.owner.username !== 'Source Keeper' || creep.pos.inRangeTo(hc, 4))
      })
    }

    // move to enemy
    if (targets.length > 0) {
      // creep.log('targets detected');

      var target = creep.pos.findClosestByRange(targets)
      // creep.log('target.pos: ' + JSON.stringify(target.pos));
      var result = creep.goTo(target.pos)
      creep.log(result)

      creep.rangedAttack(target)
      if (result === OK) { return true }
    }

    // destroy stuff

    var targets = creep.room.find(FIND_HOSTILE_STRUCTURES, {
      filter: (structure) => {
        return (structure.structureType !== STRUCTURE_CONTROLLER && structure.structureType !== STRUCTURE_RAMPART && structure.structureType !== STRUCTURE_STORAGE && structure.structureType !== STRUCTURE_KEEPER_LAIR)
      }
    })

    if (targets.length > 0) {
      var target = creep.pos.findClosestByRange(targets)
      // creep.log('found hostile structures' + JSON.stringify(target));
      if (creep.rangedAttack(target) !== OK) {
        creep.moveTo(target, {reusePath: 0 })
      }
      return true
    }

    /* var targets = creep.room.find(FIND_HOSTILE_CONSTRUCTION_SITES);

            if (targets.length > 0) {
                var target = creep.pos.findClosestByRange(targets);
                creep.moveTo(target,{reusePath: 0});

                return true;
        } */

    return false
  },

  init: function (creep) {
    creep.memory.init = true
    var rangedparts = creep.getActiveBodyparts(RANGED_ATTACK)
    if (rangedparts > 0) {
      creep.memory.ranged = true
    }
    if (creep.getActiveBodyparts(HEAL) > 0) {
      creep.memory.hasheal = true
    }
    if (creep.memory.role === 'Specialdefender') {
      console.log('init specialdefender')
    }
  },

  afteract: function (creep) {
    if (creep.memory.hasheal && creep.hits < creep.hitsMax) {
      creep.heal(creep)
    }
  },

  /** @param {Creep} creep **/
  run: function (creep) {
    if (!creep.memory.init) {
      this.init(creep)
    }
    // if (!(creep.memory.gatheringpoint !== creep.room.roomName && creep.memory.role === 'attacker')){
    var actiondone = this.act(creep)
    if (actiondone) {
      // console.log('bla' + creep.name);
      return
    }

    this.afteract(creep)
    // }

    if (Game.time % 5 === 0 && creep.memory.role === 'Specialdefender') {
      // console.log('check for rooms to defend');
      var roomname = creep.memory.room
      var cords = roomname.substr(1).replace('N', ',').replace('S', ',').split(',')
      // console.log('cords: ' + JSON.stringify(cords));
      var north = roomname.includes('N')
      var west = roomname.includes('W')
      for (var x = Number(cords[0]) - 1; x <= Number(cords[0]) + 1; x++) {
        for (var y = Number(cords[1]) - 1; y <= Number(cords[1]) + 1; y++) {
          var str = west ? 'W' : 'E'
          str += x
          str += north ? 'N' : 'S'
          str += y
          // console.log('x+y: ' + x +'/' +y + 'string: ' + str);

          if (Game.rooms[str] && Game.rooms[str].memory.dangertill && Game.rooms[str].memory.dangertill > Game.time) {
            console.log('found endangered sk room -> help' + str)
            var roompos = new RoomPosition(25, 25, Game.rooms[str].name)
            creep.memory.endangeredroom = str
            creep.goTo(roompos)
            return
          }
        }
      }
      // Game.rooms[creep.room.name].memory.dangertill
    }

    if (creep.room.name === creep.memory.endangeredroom) {
      console.log('creep is in endangeredroom -> delete memory')
      creep.memory.endangeredroom = null
    }

    if (creep.memory.endangeredroom) {
      console.log('creep has endangeredroom -> goTo ' + creep.memory.endangeredroom)
      var roompos = new RoomPosition(25, 25, (creep.memory.endangeredroom))
      creep.goTo(roompos)
      return
    }

    if (creep.room.name === creep.memory.room) {
      if (creep.memory.gatheringpoint) {
        var pos = new RoomPosition(creep.memory.gatheringpoint.x, creep.memory.gatheringpoint.y, creep.memory.gatheringpoint.roomName)
        var res = creep.moveTo(pos, {reusePath: 0 })
        return
      }
      if (creep.memory.role === 'defender' && creep.room.name !== creep.memory.home) {
        console.log(creep.room + 'creep is defender and no enemy is left -> return home')
        // no action left -> return
        creep.memory.room = creep.memory.home
        Game.rooms[creep.room.name].memory.dangertill = Game.time - 1

        var roompos = new RoomPosition(25, 25, creep.memory.home)
        creep.moveTo(roompos, {ignoreCreeps: true})
        return
      }
      if (creep.memory.home && creep.memory.room && (creep.memory.room === creep.memory.home)) {
        // console.log('creep is at home');
        creep.moveTo(creep.room.controller)
      }
    } else {
      if (creep.memory.gatheringpoint) {
        var pos = new RoomPosition(creep.memory.gatheringpoint.x, creep.memory.gatheringpoint.y, creep.memory.gatheringpoint.roomName)
        var res = creep.moveTo(pos, {ignoreCreeps: true})
        return
      }

      if (creep.hits < creep.hitsMax && creep.room.name === creep.memory.home) {
        console.log('creep is at home') // don't go yet
        return
      }

      // else go to room
      var roompos = new RoomPosition(25, 25, creep.memory.room)
      var targetroom = Game.rooms[creep.memory.room]
      if (creep.memory.lasttarget && creep.memory.lasttarget.roomName === creep.memory.room) {
        roompos = new RoomPosition(creep.memory.lasttarget.x, creep.memory.lasttarget.y, creep.memory.lasttarget.roomName)
      } else if (targetroom && targetroom.storage) {
        roompos = targetroom.storage.pos
      } else if (targetroom && targetroom.controller) {
        roompos = targetroom.controller.pos
      }
      creep.goTo(roompos)
    }
  }
}

module.exports = roleAttacker
