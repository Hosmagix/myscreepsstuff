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
  if (linkfrom && linkfrom.length > 0 && linkfrom[0].energy > 200) {
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
      creep.goTo(link.pos);
      return true;
    }
  }
}

function getEnergyFromContainer (creep) {
  // console.log('creep.name: ' +creep.name);
  let roompos = new RoomPosition(creep.memory.sourcepos.x, creep.memory.sourcepos.y, creep.memory.room);
  // var source = roompos.lookFor(LOOK_SOURCES)[0];
  let container = roompos.findInRange(FIND_STRUCTURES, 3).filter(function (structure) {
    return structure.structureType === STRUCTURE_CONTAINER;
  });
  if (container && container.length > 0) {
    // console.log(creep.name + ' sltrans founc container');
    let con = roompos.findClosestByRange(container);

    if (con.store[RESOURCE_ENERGY] > 0) {
      if (creep.withdraw(con, RESOURCE_ENERGY) !== OK) { // TODO: check first for distance
        creep.goTo(con.pos);
        return true;
      }
    }
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
    let status = creep.goTo(source.pos);
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
    creep.goTo(target.pos); // TODO: check
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
    creep.goTo(target.pos);
  }
  return true;
}

/// spend energy

function repairContainer (creep) {
  let roompos = creep.pos;
  // creep.log('roompos: ' + roompos);
  let container = roompos.findInRange(FIND_STRUCTURES, 3).filter(function (structure) {
    return structure.structureType === STRUCTURE_CONTAINER && structure.hits < structure.hitsMax;
  });
  if (container && container.length > 0) {
    // console.log('repairing containers')
    creep.repair(container[0]);
    return true;
  }
}

function dropOnContainerOrFloor (creep) {
  let roompos = new RoomPosition(creep.memory.sourcepos.x, creep.memory.sourcepos.y, creep.memory.room);
  let container = roompos.findInRange(FIND_STRUCTURES, 2).filter(function (structure) { // TODO: do some cacheing
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
      creep.goTo(con.pos);
      return true;
    }
  } else {
    creep.log('no container found -> check for construction sites');
    let containerConsts = roompos.findInRange(FIND_CONSTRUCTION_SITES, 2).filter(function (structure) { // TODO: do some cacheing
      return structure.structureType === STRUCTURE_CONTAINER;
    });
    if (containerConsts.length > 0) {
      creep.log('there is a container to be build');
      let con = containerConsts[0];
      let range = creep.pos.getRangeTo(con.pos);

      if (range <= 1) {
        creep.build(con);
      } else {
        creep.goTo(con.pos);
      }
      return true;
    }

    creep.log('no container found -> check if next to source and then build one!');
    if (creep.pos.findInRange(FIND_SOURCES, 1).length > 0) {
      creep.log('creep is next to source -> build container');
      creep.pos.createConstructionSite(STRUCTURE_CONTAINER);
    } else {
      creep.goTo(roompos);
      creep.log('move next to source first');
    }
  }
  return true;
}

function upgradeController (creep) {
  if (creep.upgradeController(creep.room.controller) === ERR_NOT_IN_RANGE) { // TODO: distance check instead of penalty
    if (creep.room.memory.upgradepos) {
      creep.moveTo(creep.room.memory.upgradepos.x, creep.room.memory.upgradepos.y); // TODO: goTO
    } else {
      creep.goTo(creep.room.controller.pos); // TODO: creep.goTo
    }
  }
  return true;
}

function harvesterToLinkIndex (creep) {
  let roompos = new RoomPosition(creep.memory.link.x, creep.memory.link.y, creep.memory.link.roomName);
  let link = roompos.lookFor(LOOK_STRUCTURES).filter(function (linki) { // TODO: cache filtered links
    return linki.structureType === STRUCTURE_LINK;
  });

  if (link) {
    let linki = link[0];
    // console.log('haslink ' + JSON.stringify(linki));
    let range = creep.pos.getRangeTo(linki.pos);
    // console.log('range to link' + range);
    if (range <= 1) {
      if (creep.transfer(linki, RESOURCE_ENERGY) === OK) {
        return true;
      }
      // console.log('creep ' + creep.name + ' cant transfer enery to the link');
      return true;
    } else {
      creep.goTo(linki.pos);
      return true;
    }
  } else {
    console.error('creep has no link: ' + creep.name + ' link' + JSON.stringify(link));
  }
}

function fillTowers (creep) {
  let towerFillTill = 800;
  if (creep.room.memory.dangertill && creep.room.memory.dangertill > Game.time) {
    towerFillTill = 600; // such that they don't fill at 990
  }

  // bring energy to tower
  let targets = creep.room.find(FIND_STRUCTURES, { // TODO: cache filtered towers
    filter: (structure) => {
      return (structure.structureType === STRUCTURE_TOWER && structure.energy < towerFillTill);
    }
  });
  if (targets.length > 0) {
    let target = creep.pos.findClosestByRange(targets);
    if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) { // TODO: move closer check first
      creep.goTo(target.pos);
    }
    return true;
  }
}

function distributeEnergy (creep) {
  let targets = creep.room.find(FIND_STRUCTURES, { // TODO: cache
    filter: (structure) => {
      return (structure.structureType === STRUCTURE_EXTENSION || structure.structureType === STRUCTURE_SPAWN || structure.structureType === STRUCTURE_LAB) && structure.energy < structure.energyCapacity;
    }
  });
  if (targets.length > 0) {
    let target = creep.pos.findClosestByRange(targets);
    if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) { // TODO: check for range
      creep.goTo(target.pos);
    }
    return true;
  }
}

function bringEnergyToTerminal (creep) {
  let terminal = creep.room.terminal;
  if (creep.transfer(terminal, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) { // TODO: check for range
    creep.goTo(terminal.pos);
  }
  return true;
}

function bringEnergyToStorage (creep) {
  if (creep.transfer(creep.room.storage, RESOURCE_ENERGY) !== OK) { // TODO: check for range
    creep.goTo(creep.room.storage.pos);
  }
  return true;
}

function bringEnergyToStorageOrClosestLink (creep) {
  let storage = creep.room.storage;
  let links = creep.room.find(FIND_MY_STRUCTURES).filter(function (structure) { // TODO: cache
    return (structure.structureType === STRUCTURE_LINK) && structure.energy <= 600;
  });
  // console.log('creep.name:' + creep.name);
  if (links.length >= 1) {
    //  console.log('found links' + JSON.stringify(links));
  }
  links.push(storage);
  let target = creep.pos.findClosestByRange(links);
  // console.log('links: ' + JSON.stringify(links) + ' become ' + JSON.stringify(target));

  if (creep.transfer(target, RESOURCE_ENERGY) !== OK) { // TODO: check for range
    creep.goTo(target.pos);
  }
  return true;
}

function buildStuff (creep) {
  let my = creep.room.controller && creep.room.controller && creep.room.controller.my;

  // repairing ramparts
  let test = null;
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
        creep.goTo(test.pos);
      }
      return true;
    }
  }

  // build
  let targets = creep.room.find(FIND_CONSTRUCTION_SITES).filter(function (constrsite) {
    return constrsite.my;
  });
  if (targets.length > 0) {
    let target = creep.pos.findClosestByRange(targets);
    // console.log(JSON.stringify(target));
    if (creep.build(target) === ERR_NOT_IN_RANGE) {
      let result = creep.goTo(target.pos);
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
        creep.goTo(test.pos);
      }
      creep.memory.repairing = true;
      return true;
    }

    creep.memory.reparing = false;

    test = creep.pos.findClosestByRange(FIND_STRUCTURES, {
      filter: object => object.hits < (object.hitsMax / 2) && object.structureType !== STRUCTURE_ROAD && object.hits < objecthits
    });

    if (test) {
      // console.log('repairing target:' + JSON.stringify(test));
      if (creep.repair(test) === ERR_NOT_IN_RANGE) {
        creep.goTo(test.pos);
      }
      return true;
    }
  }
}

function increaseWallHp (creep) {
  console.log(creep.room.name + ' increasing wallshp');
  creep.room.memory.wallshp += 300000;
  buildStuff(creep);
}

function returnHome (creep) {
  // console.log(creep.name + ' not in homeroom');

  if (creep.fatigue) {
    // console.log('fatigue');
    return true;
  }

  let homeroom = Game.rooms[creep.memory.home];

  let roomPos = new RoomPosition(25, 25, creep.memory.home);
  if (homeroom.storage) {
    roomPos = homeroom.storage.pos;
    // console.log('check1');
  } else {
    roomPos = homeroom.controller.pos;
  }
  creep.goTo(roomPos);
  return true;
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

    if (creep.memory.role !== 'dumper' && creep.memory.role !== 'outsider') {
      harvestQueue.push(generalDroppedEnergy);
    }

    if (creep.memory.linkfrom && creep.memory.role === 'transporter') {
      harvestQueue.push(getEnergyFromLink);
    }

    if (creep.memory.sourcepos && (creep.memory.role === 'sltrans' || creep.memory.role === 'keepTrans')) {
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
        return;
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

    /* let cpufinished = Game.cpu.getUsed();
    let safety = cpuaftersafetycheck - startcpu;
    let roadtime = cpuafterroads - cpuaftersafetycheck;
    let actiontime = cpufinished - cpuafterroads;
    // creep.log('cpu usage: safety: ' + safety + ' roads: ' + roadtime + ' action: ' + actiontime);
    */
  },

  spendEnergy: function (creep) {
    // repair containers

    let spendEnergyQueue = [];

    if (creep.memory.role === 'sltrans' || creep.memory.role === 'dumper' || creep.memory.role === 'outsider') {
      spendEnergyQueue.push(repairContainer);
    }

    if ((creep.memory.role === 'dumper' || creep.memory.role === 'outsider') && creep.memory.room === creep.room.name) {
      spendEnergyQueue.push(dropOnContainerOrFloor);
    }

    if (creep.memory.role === 'upgrader') {
      spendEnergyQueue.push(upgradeController);
    }

    if (creep.memory.link) { // TODO: if only harvester -> make check dependant on role
      spendEnergyQueue.push(harvesterToLinkIndex);
    }

    spendEnergyQueue.push(fillTowers);

    if (creep.memory.role === 'transporter' || (creep.memory.role === 'builder' && !(creep.room.storage && creep.room.storage.store.energy < 5000))) {
      spendEnergyQueue.push(distributeEnergy);
    }

    if (creep.memory.role === 'transporter' && creep.room.terminal &&
      (creep.room.terminal.store.energy < 30000 ||
        (creep.room.controller.level === 8 && creep.room.terminal.store.energy < 100000 && creep.room.storage && creep.room.storage.store.energy > 200000))) {
      spendEnergyQueue.push(bringEnergyToTerminal);
    }

    if ((creep.memory.role === 'transporter' || creep.memory.role === 'builder') && creep.room.storage) {
      spendEnergyQueue.push(bringEnergyToStorage);
    }

    if (creep.room.storage && (creep.memory.role === 'sltrans' || creep.memory.role === 'keepTrans' || creep.memory.role === 'gatherer' || creep.memory.role === 'looter') && creep.room.controller && creep.room.controller.my) {
      spendEnergyQueue.push(bringEnergyToStorageOrClosestLink);
    }

    spendEnergyQueue.push(buildStuff);

    if (creep.memory.role === 'specialbuilder' && creep.room.controller && creep.room.controller.level === 8) {
      spendEnergyQueue.push(increaseWallHp);
    }
    if (creep.room.controller && creep.room.controller.my && (!creep.room.memory.noupgrade || creep.room.controller.ticksToDowngrade < 5000)) {
      spendEnergyQueue.push(upgradeController);
    }

    // outside
    if (creep.memory.home && creep.memory.home !== creep.room.name) {
      spendEnergyQueue.push(returnHome);
    }

    for (let i = 0; i < spendEnergyQueue.length; i++) {
      let task = spendEnergyQueue[i];
      if (task(creep)) {
        return;
      }
    }

    creep.log(creep.name + 'tries to spend energy but cannnot' + JSON.stringify(spendEnergyQueue));
  }
};

module.exports = roleBuilder;
