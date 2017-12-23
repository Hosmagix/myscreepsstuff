function gathererDroppedEnergy (creep) {
  let resources = creep.room.find(FIND_DROPPED_RESOURCES).filter(function (res) {
    return res.resourceType === RESOURCE_ENERGY && res.energy > 300;
  });

  let target = creep.pos.findClosestByRange(resources);

  // console.log('resource:' + JSON.stringify(target));
  if (target) {
    if (creep.pickup(target) !== OK) { // TODO: check range
      creep.goTo(target.pos);
    }
    return true;
  }

  resources = creep.room.find(FIND_DROPPED_RESOURCES).filter(function (res) {
    return res.resourceType === RESOURCE_ENERGY;
  });

  target = creep.pos.findClosestByRange(resources);

  // console.log('resource:' + JSON.stringify(target));
  if (target) {
    if (creep.pickup(target) !== OK) { // TODO: check range
      creep.goTo(target.pos);
    }
    return true;
  }
}

function generalDroppedEnergy (creep) {
  let resources = creep.room.find(FIND_DROPPED_RESOURCES).filter(function (res) {
    return res.resourceType === RESOURCE_ENERGY;
  });

  let target = creep.pos.findClosestByRange(resources);
  if (target) {
    let range = creep.pos.getRangeTo(target);
    if (range <= 1) {
      creep.pickup(target);
      // creep.moveTo(target);
      return true;
    } else if (range <= 5) {
      creep.goTo(target.pos);
      return true;
    }
  }
}

function goToOtherRoom (creep) {
  if (creep.fatigue) {
    // console.log('fatigue');
    return true;
  }

  // else go to room
  let roompos = null;
  let targetroom = Game.rooms[creep.memory.room];
  if (creep.memory.lasttarget && creep.memory.lasttarget.roomName === creep.memory.room) {
    roompos = new RoomPosition(creep.memory.lasttarget.x, creep.memory.lasttarget.y, creep.memory.lasttarget.roomName);
  } else if (creep.memory.sourcepos) {
    roompos = new RoomPosition(creep.memory.sourcepos.x, creep.memory.sourcepos.y, creep.memory.room);
  } else if (creep.memory.containerpos) {
    roompos = new RoomPosition(creep.memory.containerpos.x, creep.memory.containerpos.y, creep.memory.room);
  } else if (targetroom && targetroom.controller) {
    roompos = targetroom.controller.pos;
  } else {
    roompos = new RoomPosition(25, 25, creep.memory.room);
  }
  creep.goTo(roompos);
  return true;
}

function getEnergyFromLink (creep) {
  let roompos = new RoomPosition(creep.memory.linkfrom.x, creep.memory.linkfrom.y, creep.memory.linkfrom.roomName);
  let linkfrom = roompos.lookFor(LOOK_STRUCTURES).filter(function (linki) {
    return linki.structureType === STRUCTURE_LINK;
  });

  // console.log('linkfrom: ' + JSON.stringify(linkfrom));
  if (linkfrom && linkfrom[0].energy > 200) {
    let link = linkfrom[0];
    // console.log('link: ' + JSON.stringify(link));
    let range = creep.pos.getRangeTo(link.pos);
    // console.log('range to link' + range);
    if (range <= 1) {
      let result = creep.withdraw(link, RESOURCE_ENERGY);
      // console.log('withdraw result:' + result);
      if (result === -6 && creep.memory.role !== 'transporter') {
        // -> Storage
      } else {
        return true;
      }
    } else {
      creep.moveTo(link.pos);
      return true;
    }
  }
}

function getEnergyFromContainer (creep) {
  // console.log('creep.name: ' +creep.name);
  let roompos = new RoomPosition(creep.memory.containerpos.x, creep.memory.containerpos.y, creep.memory.room);
  // var source = roompos.lookFor(LOOK_SOURCES)[0];
  let container = roompos.findInRange(FIND_STRUCTURES, 3).filter(function (structure) {
    return structure.structureType === STRUCTURE_CONTAINER;
  });
  if (container && container.length > 0) {
    // console.log(creep.name + ' sltrans founc container');
    let con = roompos.findClosestByRange(container);

    if (creep.withdraw(con, RESOURCE_ENERGY) !== OK) {
      creep.moveTo(con);
    }
    return true;
  } else {
    console.log('warning: no container found near pos: ' + JSON.stringify(roompos));
  }
}

function getEnergyFromSource (creep) {
  let roompos = new RoomPosition(creep.memory.sourcepos.x, creep.memory.sourcepos.y, creep.memory.room);
  // var source = roompos.lookFor(LOOK_SOURCES)[0];
  let source = roompos.findClosestByRange(FIND_SOURCES);

  let harvestresult = creep.harvest(source);
  if (harvestresult === ERR_NOT_IN_RANGE || harvestresult === ERR_NOT_ENOUGH_RESOURCES || harvestresult === ERR_INVALID_TARGET) {
    let status = creep.moveTo(source);
    if (status !== OK) {
      // console.log(creep.name + 'cannot move to target ' + source.pos +' because: ' + status);
      creep.moveTo(creep.room.controller);
    }
  }
  if (creep.memory.role === 'outsider' && !creep.memory.drop) {
    // console.log('checking for finished container');
    let container = roompos.findInRange(FIND_STRUCTURES, 2).filter(function (structure) {
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
  return true;
}

function getEnergyFromSourceId (creep) { // TODO: remove and use sourcepos instead
  // console.log('creep.name:' + creep.name);
  let sources = creep.room.find(FIND_SOURCES);
  let id = creep.memory.source;
  let source = sources[id];

  let harvestresult = creep.harvest(source);
  if (harvestresult === ERR_NOT_IN_RANGE) {
    creep.goTo(source.pos);
  }
  return true;
}

function getEnergyFromTerminal (creep) {
  let target = creep.room.terminal;
  if (creep.withdraw(target, RESOURCE_ENERGY) !== OK) {
    creep.moveTo(target); // TODO: check
  }
  return true;
}

function getEnergyFromClosestLinkOrStorage (creep) {
  let links = creep.room.find(FIND_MY_STRUCTURES).filter(function (structure) {
    return structure.structureType === STRUCTURE_LINK && structure.energy >= 300; // TODO: cache link part
  });
  if (links.length >= 1) {
    // console.log('found links');
  }
  links.push(creep.room.storage);
  let target = creep.pos.findClosestByRange(links);

  if (creep.withdraw(target, RESOURCE_ENERGY) !== OK) {
    creep.moveTo(target);
  }
  return true;
}

/// spend energy

function repairContainer (creep) {
  // role: sltrans
  // console.log('outsider ready to dump');
  let roompos = new RoomPosition(creep.memory.sourcepos.x, creep.memory.sourcepos.y, creep.memory.room);
  let container = roompos.findInRange(FIND_STRUCTURES, 2).filter(function (structure) {
    return structure.structureType === STRUCTURE_CONTAINER;
  });
  if (container && container.length > 0) {
    let con = container[0];
    let range = creep.pos.getRangeTo(con.pos);

    if (range <= 1) {
      let result = creep.transfer(con, RESOURCE_ENERGY);
      if (result !== OK) {
        creep.drop(RESOURCE_ENERGY, creep.carry.RESOURCE_ENERGY);
      }
      return true;
    } else {
      creep.moveTo(con);
      return true;
    }
  }
}

let roleBuilder = {

  harvest: function (creep) {
    let harvestQueue = [];

    if (creep.memory.role === 'gatherer') {
      harvestQueue.push(gathererDroppedEnergy);
    }

    // other room
    if (creep.memory.room && creep.room.name !== creep.memory.room) {
      harvestQueue.push(goToOtherRoom);
    }

    if (!creep.memory.dump) {
      harvestQueue.push(generalDroppedEnergy);
    }

    if (creep.memory.linkfrom && creep.memory.role === 'transporter') {
      harvestQueue.push(getEnergyFromLink);
    }

    if (creep.memory.containerpos && creep.memory.role === 'sltrans') {
      harvestQueue.push(getEnergyFromContainer);
    }

    if (creep.memory.sourcepos) {
      harvestQueue.push(getEnergyFromSource);
    }

    if (creep.memory.source !== undefined) {
      harvestQueue.push(getEnergyFromSourceId);
    }
    // TODO: fix condition
    if (creep.room.terminal && creep.room.terminal.store.energy > 70000 && creep.room.controller.level < 8 || creep.room.terminal && creep.room.terminal.store.energy > 0 && creep.memory.role === 'looter') {
      harvestQueue.push(getEnergyFromTerminal);
    }

    if (creep.room.storage) {
      harvestQueue.push(getEnergyFromClosestLinkOrStorage);
    }

    for (let i = 0; i < harvestQueue.length; i++) {
      let task = harvestQueue[i];
      if (task(creep)) {
        break;
      }
    }

    console.log(creep.name + '/' + creep.memory.role + ':' + creep.room.name + ' tries to harvest but finds nothing');
  },

  init: function (creep) {
    let getHarvestID = function (room) {
      let creeplist = room.find(FIND_MY_CREEPS);
      let count1 = creeplist.filter(function (creep) { return creep.memory.source === 1 && (creep.ticksToLive > 100 || creep.spawning) && (creep.memory.role === 'builder' || creep.memory.role === 'upgrader' || creep.memory.role === 'harvester'); }).length;
      let count0 = creeplist.filter(function (creep) { return creep.memory.source === 0 && (creep.ticksToLive > 100 || creep.spawning) && (creep.memory.role === 'builder' || creep.memory.role === 'upgrader' || creep.memory.role === 'harvester'); }).length;
      console.log('count 0: ' + count0 + ' count1: ' + count1);
      let res = (count1 >= count0) ? 0 : 1;
      console.log('Target source for new creep:' + res);

      return res;
    };

    let room = creep.room;
    if (creep.memory.role === 'harvester') {
      var links = room.find(FIND_STRUCTURES, {
        filter: (i) => i.structureType === STRUCTURE_LINK
      });

      creep.memory.source = getHarvestID(room);

      let sources = room.find(FIND_SOURCES);
      var targetlink = sources[creep.memory.source].pos.findClosestByRange(links);
      creep.memory.link = targetlink.pos;
    } else if ((creep.memory.role === 'transporter' || creep.memory.role === 'specialbuilder') && creep.room.memory.haslinks) {
      // transporter transports energy from the links
      var links = room.find(FIND_STRUCTURES, {
        filter: (i) => i.structureType === STRUCTURE_LINK
      });

      var targetlink = room.storage.pos.findClosestByRange(links);
      creep.memory.linkfrom = targetlink.pos;
    } else if (creep.memory.role === 'upgrader') {
      if (!room.memory.haslinks) {
        creep.memory.source = getHarvestID(room);
      }
    }
    creep.memory.init = true;
  },

  /** @param {Creep} creep **/
  run: function (creep) {
    let startcpu = Game.cpu.getUsed();
    if (!creep.memory.init) {
      this.init(creep);
    }

    if (creep.memory.dangertill && creep.memory.dangertill > Game.time) {
      //  console.log(creep.name +' target room might still be in danger -> not returning -> gathering at controller');
      let homeroom = Game.rooms[creep.memory.home];
      creep.goTo(homeroom.controller.pos);
      return true;
    }

    if (!creep.memory.nofear) {
      if (creep.checkForEnemies()) {
        return true;
      }
    } else {
      if (creep.checkForKeepers()) {
        return true;
      }
    }
    let cpuaftersafetycheck = Game.cpu.getUsed();

    creep.buildRoads(); // TODO: check for return here.

    let cpuafterroads = Game.cpu.getUsed();

    if (creep.memory.building && creep.carry.energy === 0) {
      creep.memory.building = false;
    }
    if (!creep.memory.building && creep.carry.energy === creep.carryCapacity) {
      creep.memory.building = true;
    }

    if (creep.memory.building) {
      this.spendEnergy(creep);
    } else {
      this.harvest(creep);
    }

    let cpufinished = Game.cpu.getUsed();
    let safety = cpuaftersafetycheck - startcpu;
    let roadtime = cpuafterroads - cpuaftersafetycheck;
    let actiontime = cpufinished - cpuafterroads;
    // creep.log('cpu usage: safety: ' + safety + ' roads: ' + roadtime + ' action: ' + actiontime);
  },

  spendEnergy: function (creep) {
    // repair containers

    if (creep.memory.role !== 'sltrans' && creep.memory.role !== 'gatherer' && creep.memory.role !== 'looter') {
      let result = repairContainer(creep);
      if (result) return true;
    }

    // outsiderdump

    if (creep.memory.role === 'outsider' && creep.memory.dump && creep.memory.sourcepos && creep.memory.room === creep.room.name) { // make new role
      // role: sltrans
      // console.log('outsider ready to dump');
      var roompos = new RoomPosition(creep.memory.sourcepos.x, creep.memory.sourcepos.y, creep.memory.room);
      let container = roompos.findInRange(FIND_STRUCTURES, 2).filter(function (structure) {
        return structure.structureType === STRUCTURE_CONTAINER;
      });
      if (container && container.length > 0) {
        let con = container[0];
        var range = creep.pos.getRangeTo(con.pos);

        if (range <= 1) {
          var result = creep.transfer(con, RESOURCE_ENERGY);
          if (result !== OK) {
            creep.drop(RESOURCE_ENERGY, creep.carry.RESOURCE_ENERGY);
          }
          return true;
        } else {
          creep.moveTo(con);
          return true;
        }
      }
    }

    // upgrader

    if (creep.memory.role === 'upgrader') {
      if (creep.upgradeController(creep.room.controller) === ERR_NOT_IN_RANGE) { // TODO: distance check instead of penalty
        if (creep.room.memory.upgradepos) {
          creep.moveTo(creep.room.memory.upgradepos.x, creep.room.memory.upgradepos.y);
        } else {
          let move = creep.moveTo(creep.room.controller);
        }
      }
      return true;
    }

    // harvester to link

    if (creep.memory.link) { // TODO: if only harvester -> make check dependant on role
      var roompos = new RoomPosition(creep.memory.link.x, creep.memory.link.y, creep.memory.link.roomName);
      let link = roompos.lookFor(LOOK_STRUCTURES).filter(function (linki) { // TODO: cache filtered links
        return linki.structureType === STRUCTURE_LINK;
      });

      if (link) {
        let linki = link[0];
        // console.log('haslink ' + JSON.stringify(linki));
        var range = creep.pos.getRangeTo(linki.pos);
        // console.log('range to link' + range);
        if (range <= 1) {
          if (creep.transfer(linki, RESOURCE_ENERGY) === OK) {
            return true;
          }
          // console.log('creep ' + creep.name + ' cant transfer enery to the link');
          return true;
        } else {
          creep.moveTo(linki);
          return true;
        }
      } else {
        console.error('creep has no link: ' + creep.name + ' link' + JSON.stringify(link));
      }
    }
    let towerfilltill = 800;
    if (creep.room.memory.dangertill && creep.room.memory.dangertill > Game.time) {
      towerfilltill = 600; // such that they don't fill at 990
    }

    // bring energy to tower
    var targets = creep.room.find(FIND_STRUCTURES, { // TODO: cache filtered towers
      filter: (structure) => {
        return (structure.structureType === STRUCTURE_TOWER && structure.energy < towerfilltill);
      }
    });
    if (targets.length > 0) {
      var target = creep.pos.findClosestByRange(targets);
      if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) { // TODO: move closer check first
        creep.moveTo(target);
      }
      return true;
    }

    // TODO: warning builders won't transport energy to extensions
    // bring energy to spawn
    if (creep.memory.role === 'transporter' || (creep.memory.role === 'builder' && !(creep.room.storage && creep.room.storage.store.energy < 5000))) {
      var targets = creep.room.find(FIND_STRUCTURES, { // TODO: cache
        filter: (structure) => {
          return (structure.structureType === STRUCTURE_EXTENSION || structure.structureType === STRUCTURE_SPAWN || structure.structureType === STRUCTURE_LAB) && structure.energy < structure.energyCapacity;
        }
      });
      if (targets.length > 0) {
        var target = creep.pos.findClosestByRange(targets);
        if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) { // TODO: check for range
          creep.moveTo(target);
        }
        return true;
      }
    }

    if (creep.memory.role === 'transporter' && creep.room.terminal && creep.room.terminal.store.energy < 30000) {
      var terminal = creep.room.terminal;
      if (creep.transfer(terminal, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) { // TODO: check for range
        creep.moveTo(terminal);
      }
      return true;
    }

    if (creep.memory.role === 'transporter' && creep.room.terminal && creep.room.controller.level === 8 && creep.room.terminal.store.energy < 100000 && creep.room.storage && creep.room.storage.store.energy > 200000) {
      var terminal = creep.room.terminal;
      if (creep.transfer(terminal, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) { // TODO: check for range
        creep.moveTo(terminal);
      }
      return true;
    }

    if ((creep.memory.role === 'transporter' || creep.memory.role === 'builder') && creep.room.storage) {
      if (creep.transfer(creep.room.storage, RESOURCE_ENERGY) !== OK) {
        creep.moveTo(creep.room.storage);
      }
      return true;
    }

    // bring energy to Storage

    if (creep.room.storage && (creep.memory.role === 'sltrans' || creep.memory.role === 'outsider' || creep.memory.role === 'gatherer' || creep.memory.role === 'looter' && creep.room.controller && creep.room.controller.my)) {
      let storage = creep.room.storage;
      let links = creep.room.find(FIND_MY_STRUCTURES).filter(function (structure) { // TODO: cache
        return (structure.structureType === STRUCTURE_LINK) && structure.energy <= 600;
      });
      // console.log('creep.name:' + creep.name);
      if (links.length >= 1) {
        //  console.log('found links' + JSON.stringify(links));
      }
      links.push(storage);
      var target = creep.pos.findClosestByRange(links);
      // console.log('links: ' + JSON.stringify(links) + ' become ' + JSON.stringify(target));

      if (creep.transfer(target, RESOURCE_ENERGY) !== OK) {
        creep.moveTo(target);
      }
      return true;
    }

    let my = creep.room.controller && creep.room.controller && creep.room.controller.my;

    // repairing ramparts
    var test = null;
    let objecthits = 800000;
    if (creep.room.memory.wallshp) {
      objecthits = creep.room.memory.wallshp;
    } else if (creep.room.controller && creep.room.controller.level < 4) {
      objecthits = 0;
    }
    if (!creep.memory.repairing) {
      objecthits *= 0.8;
    }

    if (my) {
      test = creep.pos.findClosestByRange(FIND_STRUCTURES, {
        filter: object => object.hits < 20000 && object.structureType === STRUCTURE_RAMPART
      });

      if (test) {
        // console.log('repairing target:' + JSON.stringify(test));
        if (creep.repair(test) === ERR_NOT_IN_RANGE) {
          creep.moveTo(test);
        }
        return true;
      }
    }

    // build
    var targets = creep.room.find(FIND_CONSTRUCTION_SITES).filter(function (constrsite) {
      return constrsite.my;
    });
    if (targets.length > 0) {
      var target = creep.pos.findClosestByRange(targets);
      // console.log(JSON.stringify(target));
      if (creep.build(target) === ERR_NOT_IN_RANGE) {
        var result = creep.moveTo(target);
        if (result !== OK && result !== ERR_TIRED) {
          console.log(creep.name + 'wants to move to construction site at ' + target.pos + 'but cannot because' + result);
        }
      }
      return true;
    }

    if (my) {
      test = creep.pos.findClosestByRange(FIND_STRUCTURES, {
        filter: object => object.hits < objecthits * 2 && object.structureType === STRUCTURE_RAMPART
      });

      // console.log('ramparts: ' + JSON.stringify(test));

      if (test) {
        // console.log('repairing target:' + JSON.stringify(test));
        if (creep.repair(test) === ERR_NOT_IN_RANGE) {
          creep.moveTo(test);
        }
        creep.memory.repairing = true;
        return true;
      }

      creep.memory.reparing = false;

      // repairing
      var test = null;

      test = creep.pos.findClosestByRange(FIND_STRUCTURES, {
        filter: object => object.hits < (object.hitsMax / 2) && object.structureType !== STRUCTURE_ROAD && object.hits < objecthits
      });

      if (test) {
        // console.log('repairing target:' + JSON.stringify(test));
        if (creep.repair(test) === ERR_NOT_IN_RANGE) {
          creep.moveTo(test);
        }
        return true;
      }
    }

    // increase wallshp when specialbuilder and nothing else to do

    if (creep.memory.role === 'specialbuilder' && creep.room.controller && creep.room.controller.level === 8) {
      console.log(creep.room.name + ' increasing wallshp');
      creep.room.memory.wallshp += 300000;
    }

    // upgrade controller

    if (creep.room.controller && creep.room.controller.my && (!creep.room.memory.noupgrade || creep.room.controller.ticksToDowngrade < 5000)) {
      if (creep.upgradeController(creep.room.controller) === ERR_NOT_IN_RANGE) {
        if (creep.room.memory.upgradepos) {
          creep.moveTo(creep.room.memory.upgradepos.x, creep.room.memory.upgradepos.y);
        } else {
          creep.moveTo(creep.room.controller);
        }
      }
      return true;
    }

    // outside
    if (creep.memory.home && creep.memory.home !== creep.room.name) {
      // console.log(creep.name + ' not in homeroom');

      if (creep.fatigue) {
        // console.log('fatigue');
        return true;
      }

      let homeroom = Game.rooms[creep.memory.home];

      var roompos = new RoomPosition(25, 25, creep.memory.home);
      if (homeroom.storage) {
        roompos = homeroom.storage.pos;
        // console.log('check1');
      } else {
        roompos = homeroom.controller.pos;
      }
      let res = creep.goTo(roompos);
      return true;
    }
    console.log(creep.name + 'tries to spend energy but cannnot');
  }
};

module.exports = roleBuilder;
