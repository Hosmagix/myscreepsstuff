
let that = null;

let roleMineral = {

  // assume: memory.mineral // mineraltype
  // memory.room -> targetroom
  // memory.home -> homeroom
  // memory.mineralpos -> mineralpos

  labneeds: function (mineral) {
    let room = that.creep.room;
    let res = room.memory.reaction && (room.memory.reaction.m1 === mineral || room.memory.reaction.m2 === mineral) || room.memory.display;
    // that.creep.log('labneeds: ' + res + ' reaction: ' + JSON.stringify(room.memory.reaction));
    return res;
  },

  terminalneeds: function (mineral) {
    let room = that.creep.room;

    let res = room.terminal && (!room.terminal.store[mineral] || room.terminal.store[mineral] < 10000);
    // that.creep.log(mineral + ' ' + res);
    return res;
  },

  harvest: function (creep) {
    if (!creep.memory.dump) {
      let resources = creep.room.find(FIND_DROPPED_RESOURCES).filter(function (res) {
        return res.resourceType === creep.memory.mineral;
      });

      var target = creep.pos.findClosestByRange(resources);
      if (target) {
        let range = creep.pos.getRangeTo(target);
        if (range <= 1) {
          creep.pickup(target);
          // creep.moveTo(target);
          return;
        } else if (range <= 5) {
          creep.moveTo(target);
          return;
        }
      }
    }
    // other room
    if (creep.memory.room && creep.room.name !== creep.memory.room) {
      var roompos = new RoomPosition(25, 25, creep.memory.room);
      if (creep.memory.sourcepos) {
        roompos = new RoomPosition(creep.memory.sourcepos.x, creep.memory.sourcepos.y, creep.memory.room);
      }
      let result = creep.moveTo(roompos);
      if (result !== 0 && result !== -4) {
        // console.log(creep.name + ' could not find ists way because:'+result);
      }
      return;
    }

    if (creep.memory.containerpos && creep.memory.role === 'mineralsltrans') {
      var roompos = new RoomPosition(creep.memory.containerpos.x, creep.memory.containerpos.y, creep.memory.room);
      // var source = roompos.lookFor(LOOK_SOURCES)[0];
      var container = roompos.findInRange(FIND_STRUCTURES, 3).filter(function (structure) {
        return structure.structureType === STRUCTURE_CONTAINER;
      });
      if (container && container.length > 0) {
        // console.log(creep.name + ' sltrans founc container');
        let con = container[0];

        if (creep.withdraw(con, creep.memory.mineral) !== OK) {
          creep.moveTo(con);
        }
        return;
      }
    }

    if (creep.memory.mineralpos) {
      // console.log(JSON.stringify(creep.memory));

      var roompos = new RoomPosition(creep.memory.mineralpos.x, creep.memory.mineralpos.y, creep.memory.room);
      // var source = roompos.lookFor(LOOK_SOURCES)[0];
      let source = roompos.findClosestByRange(FIND_MINERALS);

      let harvestresult = creep.harvest(source);
      if (harvestresult === ERR_NOT_IN_RANGE || harvestresult === ERR_INVALID_TARGET) {
        let status = creep.moveTo(source);
        if (status !== OK) {
          // console.log(creep.name + 'cannot move to target ' + source.pos +' because: ' + status);
          creep.moveTo(creep.room.controller);
        }
      } else {
        if (source.ticksToRegeneration && harvestresult === ERR_NOT_ENOUGH_RESOURCES) {
          // console.log('source is depleted: regen in:' + source.ticksToRegeneration);
          creep.room.memory.mineralregentime = Game.time + source.ticksToRegeneration;
          return;
        }
      }
      if (creep.memory.role === 'mineraloutsider' && !creep.memory.drop) {
        // console.log('checking for finished container');
        var container = roompos.findInRange(FIND_STRUCTURES, 2).filter(function (structure) {
          // console.log('structure: ' + JSON.stringify(structure));
          return structure.structureType === STRUCTURE_CONTAINER;
        });
        if (container && container.length > 0) {
          // console.log('finished container found');
          // console.log( Game.rooms[creep.memory.home].memory.slaverooms.length);
          Game.rooms[creep.memory.home].memory.slaverooms.forEach(function (slaveroom) {
            if (slaveroom && slaveroom.x === roompos.x && slaveroom.y === roompos.y && slaveroom.roomName === roompos.roomName) {
              // console.log('setting flag for container');
              slaveroom.container = true;
            }
          });
        }
      }

      return;
    }

    // storage

    let terminal = creep.room.terminal;

    let storage = creep.room.storage;
    if (storage) {
      // creep.log('rolemineraL:storage');
      var mineral = null;
      Object.keys(storage.store).forEach(function (key) {
        let amount = storage.store[key];

        let structurefull = false;
        let targets = creep.room.find(FIND_STRUCTURES, {
          filter: (structure) => {
            return (structure.structureType === STRUCTURE_LAB) && structure.mineralType && structure.mineralType === key;
          }
        });
        if (targets.length > 0) {
          let target = creep.pos.findClosestByRange(targets);
          // console.log('lab with mineral found + target.minerlAmount' + target.mineralAmount + 'target.mineralcapacity ' + target.mineralCapacity);
          if (target.mineralAmount > (target.mineralCapacity - 1000)) {
            structurefull = true;
          }
        }

        if (amount > 0 && key !== 'energy' && (that.terminalneeds(key) || !structurefull && that.labneeds(key))) {
          mineral = key;
        }
      });
      if (mineral) {
        if (creep.withdraw(storage, mineral) !== OK) {
          creep.moveTo(storage);
        }
        return;
      }
    }

    if (terminal) {
      Object.keys(terminal.store).forEach(function (key) {
        let amount = terminal.store[key];
        let structurefull = false;
        let targets = creep.room.find(FIND_STRUCTURES, {
          filter: (structure) => {
            return (structure.structureType === STRUCTURE_LAB) && structure.mineralType && structure.mineralType === key;
          }
        });
        if (targets.length > 0) {
          let target = creep.pos.findClosestByRange(targets);
          // console.log('lab with mineral found + target.minerlAmount' + target.mineralAmount + 'target.mineralcapacity ' + target.mineralCapacity);
          if (target.mineralAmount > (target.mineralCapacity - 1000)) {
            structurefull = true;
          }
        }

        // console.log('amount ' + amount + ' key ' + key + ' structurefull ' + structurefull);

        if (amount > 0 && key !== 'energy' && !structurefull && that.labneeds(key)) {
          mineral = key;
        }
      });
      if (creep.withdraw(terminal, mineral) !== OK) {
        creep.moveTo(terminal);
      }
    }

    let targets = creep.room.find(FIND_STRUCTURES, {
      filter: (structure) => {
        return (structure.structureType === STRUCTURE_LAB) && structure.mineralType && creep.room.memory.reaction && structure.mineralType === creep.room.memory.reaction.res && (structure.mineralAmount > 2000);
      }
    });
    if (targets.length > 0) {
      // console.log('target found');
      var target = targets[0];
      if (creep.withdraw(target, target.mineralType) !== OK) {
        creep.moveTo(target);
      }
    }

    // console.log(creep.memory.role + ' ' + creep.name + ' tries to harvest but finds nothing');
  },

  init: function (creep) {
    if (creep.memory.role !== 'mineraltransporter') {
      // TODO: fixme -> other room compatible
      let mineral = creep.room.find(FIND_MINERALS);
      let mineraltype = mineral[0].mineralType;
      creep.memory.mineral = mineraltype;
      creep.memory.mineralpos = mineral[0].pos;
    }

    creep.memory.init = true;

    if (!creep.memory.room) {
      creep.memory.room = creep.room.name;
    }
  },

  run: function (creep) {
    that = this;
    that.creep = creep;

    if (!creep.memory.init) {
      this.init(creep);
    }

    if (creep.memory.dangertill && creep.memory.dangertill > Game.time && creep.memory.home && creep.room.name === creep.memory.home) {
      //  console.log(creep.name +' target room might still be in danger -> not returning -> gathering at controller');
      creep.moveTo(creep.room.controller);
      return;
    }

    if (creep.checkForEnemies()) {
      return;
    }

    creep.buildRoads();

    let totalcarrying = _.sum(creep.carry);

    if (creep.memory.building && totalcarrying === 0) { // !(creep.carry[creep.memory.mineral])
      creep.memory.building = false;
      creep.say('gathering');
    }
    // console.log(JSON.stringify(creep.carry) + '' +creep.memory.mineral +  ' building' +creep.memory.building);
    if (!creep.memory.building && totalcarrying === creep.carryCapacity) {
      creep.memory.building = true;
      creep.say('spending');
    }

    // console.log('carry: ' + JSON.stringify(creep.carry));
    // console.log('carrykeys: ' + JSON.stringify(Object.keys(creep.carry)));

    if (creep.memory.building) {
      let mineral = null;
      Object.keys(creep.carry).forEach(function (key) {
        let amount = creep.carry[key];
        if (amount > 0 && key !== 'energy') {
          mineral = key;
        }
      });

      this.spendEnergy(creep, mineral);
    } else {
      this.harvest(creep);
    }
  },

  spendEnergy: function (creep, mineral) {
    if (creep.memory.role === 'mineraloutsider' && creep.memory.dump && creep.memory.mineralpos && creep.memory.room === creep.room.name) {
      // role: sltrans
      // console.log('outsider ready to dump');
      let roompos = new RoomPosition(creep.memory.mineralpos.x, creep.memory.mineralpos.y, creep.memory.room);
      let container = roompos.findInRange(FIND_STRUCTURES, 2).filter(function (structure) {
        return structure.structureType === STRUCTURE_CONTAINER;
      });
      if (container && container.length > 0) {
        let con = container[0];
        let range = creep.pos.getRangeTo(con.pos);

        if (range <= 1) {
          let result = creep.transfer(con, creep.memory.mineral);
          if (result !== OK) {
            creep.drop(creep.memory.mineral, creep.carry[creep.memory.mineral]);
          }
          return;
        } else {
          creep.moveTo(con);
          return;
        }
      }
    }

    if (creep.memory.role === 'mineraltransporter' && that.labneeds(mineral)) {
      // bring energy to lab
      // filled labs
      var targets = creep.room.find(FIND_STRUCTURES, {
        filter: (structure) => {
          return (structure.structureType === STRUCTURE_LAB) && structure.mineralType && structure.mineralType === mineral;
        }
      });
      if (targets.length > 0) {
        // console.log('lab with mineral found');
        var target = creep.pos.findClosestByRange(targets);
        if (target.mineralAmount < (target.mineralCapacity)) {
          // console.log('lab not full yet -> fill');
          if (creep.transfer(target, mineral) === ERR_NOT_IN_RANGE) {
            creep.moveTo(target);
          }
          return;
        }
      } else {
        // empty labs
        // console.log('no lab found -> looking for empty ones');
        var targets = creep.room.find(FIND_STRUCTURES, {
          filter: (structure) => {
            return (structure.structureType === STRUCTURE_LAB) && structure.mineralAmount === 0;
          }
        });
        if (targets.length > 0) {
          var target = creep.pos.findClosestByRange(targets);
          if (creep.transfer(target, mineral) === ERR_NOT_IN_RANGE) {
            creep.moveTo(target);
          }
          return;
        }
      }
    }

    if (creep.room.terminal && mineral && that.terminalneeds(mineral)) {
      let terminal = creep.room.terminal;
      if (creep.transfer(terminal, mineral) === ERR_NOT_IN_RANGE) {
        creep.moveTo(terminal);
      }
      return;
    }

    // bring energy to Storage
    if (creep.room.storage) {
      let storage = creep.room.storage;
      if (creep.transfer(storage, mineral) === ERR_NOT_IN_RANGE) {
        creep.moveTo(storage);
      }
      return;
    }

    // outside
    if (creep.memory.home && creep.memory.home !== creep.room.name) {
      // console.log(creep.name + ' not in homeroom');

      let homeroom = Game.rooms[creep.memory.home];

      let exitDir = creep.room.findExitTo(homeroom);
      if (homeroom.storage) {
        creep.moveTo(homeroom.storage);
      } else {
        creep.moveTo(homeroom.controller);
      }
      return;
    }

    console.log(creep.name + 'tries to spend energy but cannnot');
  }
};
module.exports = roleMineral;
