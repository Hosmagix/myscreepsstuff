let roleKeeper = {

  act: function (creep) {
    if (creep.memory.ranged) {
      var result = this.ranged_act(creep);
      this.afteract(creep); // heal and ranged_attack are both possible at the same time
      return result;
    }

    // adjacent creeps
    var targets = creep.room.find(FIND_HOSTILE_CREEPS).filter(function (hc) {
      return (creep.pos.inRangeTo(hc, 1));
    });

    if (targets.length > 0) {
      var target = creep.pos.findClosestByRange(targets);
      if (creep.attack(target) !== OK) {
        if (creep.moveTo(target, {reusePath: 0}) === OK) {
          creep.attack(target);
        }
        this.afteract(creep);
      } else if (target.getActiveBodyparts(ATTACK) > 0) {
        this.afteract(creep);
      }
      return true;
    }

    // offensive creeps but no keepers
    var targets = creep.room.find(FIND_HOSTILE_CREEPS);
    if (creep.memory.ignoreneutrals) {
      targets = targets.filter(function (hc) {
        return (hc.owner.username !== 'Source Keeper' || creep.pos.inRangeTo(hc, 4)) && (hc.getActiveBodyparts(ATTACK) > 0 || hc.getActiveBodyparts(RANGED_ATTACK > 0) || hc.getActiveBodyparts(HEAL) > 0);
      });
    }

    if (targets.length > 0) {
      var target = creep.pos.findClosestByRange(targets);

      if (creep.attack(target) !== OK) {
        if (creep.goTo(target.pos, 2, 10) === OK) {
          creep.attack(target);
        }
        this.afteract(creep);
      }

      return true;
    }

    // offensive creeps
    var targets = creep.room.find(FIND_HOSTILE_CREEPS).filter(function (hc) {
      return (hc.getActiveBodyparts(ATTACK) > 0 || hc.getActiveBodyparts(RANGED_ATTACK) > 0 || hc.getActiveBodyparts(HEAL) > 0);
    });

    if (targets.length > 0) {
      var target = creep.pos.findClosestByRange(targets);

      if (creep.attack(target) !== OK) {
        if (creep.goTo(target.pos, 2, 10) === OK) {
          creep.attack(target);
        }
        /* if (creep.moveTo(target) === OK){
                    creep.attack(target);
                } */
        this.afteract(creep);
      }

      return true;
    }

    // normal creeps
    var targets = creep.room.find(FIND_HOSTILE_CREEPS);

    if (targets.length > 0) {
      var target = creep.pos.findClosestByRange(targets);
      if (creep.attack(target) !== OK) {
        // console.log('blaaa');
        if (creep.moveTo(target, {reusePath: 0}) === OK) {
          creep.attack(target);
        }
        creep.memory.lasttarget = target.pos;
        this.afteract(creep);
      }
      return true;
    }

    // damaged
    if (creep.hits < creep.hitsMax && (creep.getActiveBodyparts(HEAL) === 0)) {
      // console.log('creep is damaged');

      if (creep.memory.home && creep.memory.home !== creep.room.name) {
        // console.log('creep is outside -> go home');
        let homeroom = Game.rooms[creep.memory.home];
        let exitDir = creep.room.findExitTo(homeroom);
        let exit = creep.pos.findClosestByRange(exitDir);
        creep.moveTo(exit);
        return;
      } else {
        // console.log('creep is at home');
        creep.moveTo(creep.room.controller);
      }
      return true;
    }

    return false;
  },

  ranged_act: function (creep) {
    // console.log('rangedact called')
    // set safepoint
    if (!creep.memory.safepoint || creep.memory.safepoint.roomName !== creep.room.name) { // && creep.pos.x > 0 && creep.pos.y > 0 && creep.pos.x < 49 && creep.pos.y < 49
      // console.log('creep just enered other room -> set safepoint');
      if (creep.room.name === creep.memory.home) {
        // console.log('creep is in homeroom');
        // set roomcontroller as default safepoint
        creep.memory.safepoint = creep.room.controller.pos;
      } else {
        // console.log('creep is in other room');
        creep.memory.safepoint = creep.pos;
      }
    }

    var targets = creep.pos.findInRange(FIND_HOSTILE_CREEPS, 1);
    if (targets.length > 0) {
      creep.rangedMassAttack();
      var roompos = new RoomPosition(creep.memory.safepoint.x, creep.memory.safepoint.y, creep.room.name);
      creep.moveTo(roompos, {reusePath: 0});
      return true;
    }

    var targets = creep.pos.findInRange(FIND_HOSTILE_CREEPS, 2);
    if (targets.length > 0) {
      // console.log('hostile creeps in range 2 -> run')
      creep.rangedAttack(targets[0]);
      var roompos = new RoomPosition(creep.memory.safepoint.x, creep.memory.safepoint.y, creep.room.name);
      creep.moveTo(roompos, {reusePath: 0});
      return true;
    }

    var targets = creep.pos.findInRange(FIND_HOSTILE_CREEPS, 3);
    if (targets.length > 0) {
      // console.log('hostile creeps in range 3 -> do nothing')
      creep.rangedAttack(targets[0]);
      return true;
    }

    // offensive creeps
    var targets = creep.room.find(FIND_HOSTILE_CREEPS);
    if (creep.memory.ignoreneutrals) {
      targets = targets.filter(function (hc) {
        return (hc.owner.username !== 'Source Keeper' || creep.pos.inRangeTo(hc, 4));
      });
    }

    // move to enemy
    if (targets.length > 0) {
      console.log('targets detected');

      let target = creep.pos.findClosestByRange(targets);
      if (creep.moveTo(target, {reusePath: 0}) === OK) {
        creep.rangedAttack(target);
      }
      return true;
    }
    // damaged

    if (creep.hits < creep.hitsMax) {
      // console.log('creep is damaged');

      if (creep.memory.home && creep.memory.home !== creep.room.name) {
        // console.log('creep is outside -> go home');
        let homeroom = Game.rooms[creep.memory.home];
        let exitDir = creep.room.findExitTo(homeroom);
        let exit = creep.pos.findClosestByRange(exitDir);
        creep.moveTo(exit);
        return;
      } else {
        // console.log('creep is at home');
        creep.moveTo(creep.room.controller);
      }
      return true;
    }

    return false;
  },

  init: function (creep) {
    creep.memory.init = true;
    let rangedparts = creep.getActiveBodyparts(RANGED_ATTACK);
    if (rangedparts > 0) {
      creep.memory.ranged = true;
    }
    if (creep.getActiveBodyparts(HEAL) > 0) {
      creep.memory.hasheal = true;
    }
  },

  afteract: function (creep) {
    if (creep.memory.hasheal && creep.hits < creep.hitsMax) {
      creep.heal(creep);
    }
  },

  /** @param {Creep} creep **/
  run: function (creep) {
    if (!creep.memory.init) {
      this.init(creep);
    }

    // this.afteract(creep);

    let actiondone = this.act(creep);

    if (actiondone) {
      return;
    }

    this.afteract(creep);

    if (creep.room.name !== creep.memory.room) {
      let roompos = new RoomPosition(25, 25, creep.memory.room);

      if (creep.memory.lasttarget && creep.memory.lasttarget.roomName === creep.memory.room) {
        roompos = new RoomPosition(creep.memory.lasttarget.x, creep.memory.lasttarget.y, creep.memory.lasttarget.roomName);
      }

      creep.goTo(roompos);
      return;
    }

    let lowestrespawntime = 1000;
    let nextrespawn = null;
    let lairs = creep.room.find(FIND_HOSTILE_STRUCTURES).filter(function (structure) {
      return structure.structureType === STRUCTURE_KEEPER_LAIR;
    }).forEach(function (lair) {
      if (lair.ticksToSpawn < lowestrespawntime) {
        lowestrespawntime = lair.ticksToSpawn;
        nextrespawn = lair;
      }
    });
    if (nextrespawn && !creep.pos.inRangeTo(nextrespawn)) {
      creep.goTo(nextrespawn.pos);
    }
  }
};

module.exports = roleKeeper;
