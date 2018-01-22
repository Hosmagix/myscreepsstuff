let handleFlags = require('handleFlags');
let moveCreeps = require('moveCreeps');
let overridePrototypes = require('OverridePrototypes');
let handleTerminals = require('handleTerminals');
let creepStatus = require('CreepStatus');
let creepUtils = require('CreepComponentUtils');
let findReaction = require('findReaction');

module.exports.loop = function () {
  let startcpu = Game.cpu.getUsed();

  overridePrototypes.overridePrototypes();

  for (let name in Memory.creeps) {
    if (!Game.creeps[name]) {
      delete Memory.creeps[name];
    }
  }
  for (let name in Memory.flags) {
    if (!Game.flags[name]) {
      delete Memory.flags[name];
    }
  }

  creepStatus.AddCreepStatusToRoomInfo();

  let gatheringpoint = Memory.gatheringpoint;
  let warroom = null;
  let attackingcreeps = _.filter(Game.creeps, (creep) => creep.memory.role === 'attacker' || creep.memory.role === 'healer' || creep.memory.role === 'dismantler');

  handleFlags.handleflags();

  let flagcpu = Game.cpu.getUsed();

  // Global level decisions

  if (Memory.warroom) {
    warroom = Memory.warroom;
  }

  attackingcreeps.forEach(function (creep) {
    // console.log('creep:' +creep.name);
    if (creep.memory.globalguidance) {
      creep.memory.room = warroom;
      creep.memory.gatheringpoint = gatheringpoint;
    }
  });

  Memory.masterroom = Memory.masterroom || Game.spawns.Spawn1.room.name;

  if (Game.time % 100 === 3 || !Memory.energytarget) {
    let mincontrollerlevel = 8;
    let progress = 0;
    let roomname = '';
    for (let room_id in Game.rooms) {
      let room = Game.rooms[room_id];
      if (room.controller && room.controller.my && room.controller.level < 8 && room.controller.level < mincontrollerlevel && room.terminal) {
        roomname = room.name;
        mincontrollerlevel = room.controller.level;
        progress = room.controller.progress;
      } else if (room.controller && room.controller.my && room.controller.level < 8 && room.controller.level === mincontrollerlevel && room.controller.progress < progress && room.terminal) {
        roomname = room.name;
        mincontrollerlevel = room.controller.level;
        progress = room.controller.progress;
      }
    }
    if (roomname) {
      console.log('room:' + roomname + 'is the lowest with a terminal with progress ' + mincontrollerlevel + ':' + progress);
      Memory.energytarget = roomname;
    }
  }

  moveCreeps.moveCreeps();

  let creepscpu = Game.cpu.getUsed();

  let targets;
  for (let room_id in Game.rooms) {
    let room = Game.rooms[room_id];

    if (!room.controller || !room.controller.my) {
      // no room with a controller -> do nothing
      continue;
    }

    // controller required but no spawn
    if (!room.memory.wallshp) {
      room.memory.wallshp = 100000;
    }

    let roomname = room.name;

    // activate safemode

    let danger = false;
    targets = room.findHostileCreeps();
    let numinvaders = targets.length;

    let towers = room.find(FIND_MY_STRUCTURES, {
      filter: (structure) => {
        return (structure.structureType === STRUCTURE_TOWER);
      }
    });

    if (targets.length >= 1) {
      danger = true;
      room.memory.dangertill = Game.time + 50;
      console.log('setting dangertill');

      // TODO add condition that this code part isn't reached every single tick.
      if (towers.length === 0) {
        let result = room.controller.activateSafeMode();
        console.log('activated safe mode because no towers were there:' + result);
      } else if (targets.length > 3 && room.controller.level < 8) {
        let result = room.controller.activateSafeMode();
        console.log('activated safe mode because 4 opponents are scary:' + result);
      } else if (targets.length > 5) {
        let result = room.controller.activateSafeMode();
        console.log('activated safe mode because 6 opponents are scary:' + result);
      }

      towers.forEach(function (tower) {
        let hostileCreeps = room.findHostileCreeps();
        let closest = tower.pos.findClosestByRange(hostileCreeps);
        // console.log('attacking closest enemy');
        tower.attack(closest);
      });
    } else {
      let damagedCreeps = room.findFriendlyDamagedCreeps();

      if (damagedCreeps.length > 0) {
        towers.forEach(function (tower) {
          let closestCreep = tower.pos.findClosestByRange(damagedCreeps);
          if (closestCreep) {
            tower.heal(closestCreep);
          }
        });
      }
    }

    let spawns = room.find(FIND_MY_SPAWNS);
    let spawn = spawns[0];
    if (!spawn) {
      continue;
    }

    if (Game.time % 100 === 0) {
      findReaction.checkIfFunctionShouldBeChanged();
    }

    // terminal

    handleTerminals.handleTerminals(room);

    // mineralregen
    if (!room.memory.mineralregentime) {
      room.memory.mineralregentime = Game.time - 1;
    }

    // display

    if (!room.memory.reaction) {
      room.memory.display = true;
    }

    // slaveroomlogic
    var slaveRoomInDanger = false;
    var endangeredSlaveRoom = '';
    if (room.memory.slaverooms && room.memory.slaverooms.length > 0) {
      room.memory.slaverooms.forEach(function (slaveroom, index) {
        if (!slaveroom) {
          return;
        }
        // TODO: calculate distance

        let room2 = Game.rooms[slaveroom.roomName];

        if (room2 && room2.memory.dangertill && (room2.memory.dangertill > Game.time)) {
          slaveRoomInDanger = true;
          endangeredSlaveRoom = slaveroom.roomName;
        }
      });
    }

    if (room.memory.supportedRooms && room.memory.supportedRooms.length > 0) {
      room.memory.supportedRooms.forEach(function (childRoom, index) {
        if (!childRoom) {
          return;
        }

        let room2 = Game.rooms[childRoom.roomName];

        if (room2 && room2.memory.dangertill && (room2.memory.dangertill > Game.time)) {
          slaveRoomInDanger = true;
          endangeredSlaveRoom = childRoom.roomName;
        }
        let supportTill = room.controller.level >= 5 ? 3 : 2;
        if (room2 && room2.controller && room2.controller.level > supportTill) {
          // room is self sustainable -> remove help
          room.memory.supportedRooms.splice(index, 1);
          room.log('freeing slaveroom because it needs no help: ' + endangeredSlaveRoom);
        }
      });
    }

    if (room.memory.keeperrooms && room.memory.keeperrooms.length > 0) { // TODO maybe remove because centralroom
      //  console.log('room has keeperroomms: ' + room.memory.keeperrooms);
      room.memory.keeperrooms.forEach(function (slaveroom, index) {
        if (!slaveroom) {
          return;
        }
        // console.log('room has keeperrooms2: ' + JSON.stringify(slaveroom));
        // TODO: calculate distance

        let room2 = Game.rooms[slaveroom];

        if (room2 && room2.memory.dangertill && (room2.memory.dangertill > Game.time)) {
          //  room2.log('endangered keeperRoom: ');
          slaveRoomInDanger = true;
          endangeredSlaveRoom = slaveroom;
        }
      });

      if (room.memory.centralroom && !slaveRoomInDanger) {
        let centralRoom = Game.rooms[room.memory.centralroom];
        if (centralRoom && centralRoom.memory.dangertill && (centralRoom.memory.dangertill > Game.time)) {
          slaveRoomInDanger = true;
          endangeredSlaveRoom = room.memory.centralroom;
        }
      }
    }

    if (endangeredSlaveRoom) {
      room.log('endangered slaveroom is: ' + endangeredSlaveRoom);
      room.myCreeps.defender.forEach(function (creep) {
        creep.memory.room = endangeredSlaveRoom; // TODO bad design maybe do this at another location alltogether
      });
    }

    // getting first free spawn
    let firstfreespawn = -1;
    if (spawns[0] && !spawns[0].spawning) {
      firstfreespawn = 0;
    } else if (spawns[1] && !spawns[1].spawning) {
      firstfreespawn = 1;
    } else if (spawns[2] && !spawns[2].spawning) {
      firstfreespawn = 2;
    }

    if (firstfreespawn >= 0) {
      let builders = room.myCreeps.builder.length;
      let upgraders = room.myCreeps.upgrader.length;
      let harvesters = room.myCreeps.harvester.length;
      let transporters = room.myCreeps.transporter.length, reserver = room.myCreeps.reserver.length,
        defenders = room.myCreeps.defender.length, attackers = room.myCreeps.attacker.length,
        healers = room.myCreeps.healer.length, specialbuilders = room.myCreeps.specialbuilder.length,
        mineral = room.myCreeps.mineral.length, mineraltransporters = room.myCreeps.mineraltransporter.length,
        dismantlers = room.myCreeps.dismantler.length, specialdefenders = room.myCreeps.Specialdefender.length,
        looters = room.myCreeps.looter.length;
      var slaves = {};
      var slavetransporter = {};
      var reserving = {};
      var keepers = {};
      var gatherers = {};
      let childBuilders = {};

      // let roles = ['builder', 'upgrader', 'outsider', 'sltrans', 'harvester', 'transporter', 'reserver', 'defender',
      //   'attacker', 'healer', 'specialbuilder', 'mineral', 'mineraltransporter', 'dismantler', 'keeper', 'gatherer',
      // 'Specialdefender', 'looter' ]

      if (room.memory.slaverooms) {
        room.memory.slaverooms.forEach(function (roompos) {
          if (!roompos) {
            return;
          }
          let roomName = JSON.stringify(roompos);
          slaves[roomName] = 0;
          slavetransporter[roomName] = 0;
        });
      }

      let supporterId = '';
      if (room.memory.supportedRooms) {
        room.memory.supportedRooms.forEach(function (roompos) {
          if (!roompos) {
            return;
          }
          let roomName = JSON.stringify(roompos);

          let roomInstance = Game.rooms[roomname];
          if (roomInstance && roomInstance.memory.sources) {
            roomInstance.memory.sources.forEach((source) => {
              let sourceString = JSON.stringify(source);
              // console.log('sourceString before stringify: ' + sourceString);
              childBuilders[sourceString] = 0;
            });
          }
        });

        room.myCreeps.supporter.forEach((creep) => {
          let roomName = JSON.stringify(creep.memory.sourcepos);
          if (childBuilders[roomName]) {
            childBuilders[roomName] = childBuilders[roomName] + 1;
          } else {
            childBuilders[roomName] = 1;
          }
        });

        for (let x in childBuilders) {
          if (childBuilders[x] < 1) {
            supporterId = x;
          }
        }
      }

      let keeperTransporterId = ''; // TODO refactor this: calculate this lazy only when needed.
      let dumperId = '';
      if (room.memory.keeperrooms) {
        let keeperTransporters = {};
        let dumpers = {};

        room.memory.keeperrooms.forEach(function (roomname) {
          keepers[roomname] = 0;
          gatherers[roomname] = 0; // the guy who helps all a bit

          let keeperRoom = Game.rooms[roomname];
          if (keeperRoom && keeperRoom.memory.sources) {
            keeperRoom.memory.sources.forEach((source) => {
              let sourceString = JSON.stringify(source);
              // console.log('sourceString before stringify: ' + sourceString);
              keeperTransporters[sourceString] = 0;
              dumpers[sourceString] = 0;
            });
          }
        });
        if (room.memory.centralroom) {
          let centralRoom = room.memory.centralroom;

          gatherers[centralRoom] = 0; // the guy who helps all a bit

          let keeperRoom = Game.rooms[centralRoom];
          if (keeperRoom && keeperRoom.memory.sources) {
            keeperRoom.memory.sources.forEach((source) => {
              let sourceString = JSON.stringify(source);
              // console.log('sourceString before stringify: ' + sourceString);
              keeperTransporters[sourceString] = 0;
              dumpers[sourceString] = 0;
            });
          }
        }

        room.myCreeps.dumper.forEach((creep) => {
          let sourceString = JSON.stringify(creep.memory.sourcepos);
          if (!dumpers[sourceString]) {
            // room.log('this sourceString is not found in dumpers: ' + sourceString + ' dumpers: ' + JSON.stringify(dumpers));
          }
          if (sourceString) {
            dumpers[sourceString] = dumpers[sourceString] + 1;
          } else {
            dumpers[sourceString] = 1; // some JSON.stringify shenanigans ...
          }
        });

        for (let x in dumpers) {
          if (dumpers[x] < 1) {
            dumperId = x;
          }
        }

        room.myCreeps.keepTrans.forEach((creep) => {
          let sourceString = JSON.stringify(creep.memory.sourcepos);
          if (sourceString) {
            keeperTransporters[sourceString] = keeperTransporters[sourceString] + 1;
          } else {
            keeperTransporters[sourceString] = 1;
          }
        });

        for (let x in keeperTransporters) {
          if (keeperTransporters[x] < 1) {
            keeperTransporterId = x;
          }
        }
      }

      room.myCreeps.outsider.forEach((creep) => {
        let roomName = JSON.stringify(creep.memory.sourcepos);
        // console.log('roomname: ' + roomName);
        if (slaves[roomName]) {
          slaves[roomName] = slaves[roomName] + 1;
        } else {
          slaves[roomName] = 1;
        }
      });

      room.myCreeps.sltrans.forEach((creep) => {
        let roomName = JSON.stringify(creep.memory.sourcepos);
        if (slavetransporter[roomName]) {
          slavetransporter[roomName] = slavetransporter[roomName] + 1;
        } else {
          slavetransporter[roomName] = 1;
        }
      });

      room.myCreeps.reserver.forEach((creep) => {
        let roomName = creep.memory.room;
        reserving[roomName] = true;
      });

      room.myCreeps.keeper.forEach((creep) => {
        if (creep.ticksToLive > 200 || creep.spawning) {
          let roomName = creep.memory.room;
          if (keepers[roomName]) {
            keepers[roomName]++;
          } else {
            keepers[roomName] = 1;
          }
        }
      });

      room.myCreeps.gatherer.forEach((creep) => {
        if (creep.ticksToLive > 200 || creep.spawning) {
          let roomName = creep.memory.room;
          if (gatherers[roomName]) {
            gatherers[roomName]++;
          } else {
            gatherers[roomName] = 1;
          }
        }
      });

      let slaveid = '';
      for (var x in slaves) {
        if (slaves[x] < 1) {
          slaveid = x;
        }
      }
      let slavetransid = '';
      for (var x in slavetransporter) {
        if (slavetransporter[x] < 1) {
          slavetransid = x;
        }
      }

      let keeperid = '';
      for (var x in keepers) {
        if (keepers[x] < 1) {
          keeperid = x;
        }
      }

      let gathererid = '';
      for (var x in gatherers) {
        if (gatherers[x] < 1) {
          gathererid = x;
        }
      }

      let roomtoreserve = null;
      let singleroomreserve = null;

      // console.log('reserving: ' + JSON.stringify(reserving));

      for (var y in room.memory.slaverooms) {
        let name = room.memory.slaverooms[y].roomName;
        let claimroom = Game.rooms[name];

        if (claimroom && claimroom.controller) {
          // console.log('controller is here');
          // console.log('claimroom.controller.reservation: ' + JSON.stringify(claimroom.controller.reservation) + ' owner: ' + claimroom.controller.owner + ' sources: ' + claimroom.memory.sources.length);
          if ((!claimroom.controller.reservation || claimroom.controller.reservation.ticksToEnd < 1000) && !reserving[name] && claimroom.memory.sources.length === 2 && !claimroom.controller.owner) {
            roomtoreserve = name;
            // console.log('found room to reserve');
          } else if ((!claimroom.controller.reservation || claimroom.controller.reservation.ticksToEnd < 1000) && !reserving[name] && claimroom.memory.sources.length === 1 && !claimroom.controller.owner) {
            singleroomreserve = name;
          }
        }
      }
      // console.log('roomtoreserve:' + roomtoreserve);

      let maxattackers = 1;
      let maxhealers = 3;
      let maxdismantlers = 2;
      if (attackers >= maxattackers && healers >= maxhealers && dismantlers >= maxdismantlers) {
        // Memory.attackinprogress = false;
        room.memory.guidedattack = false;
      }
      // Memory.attackinprogress = false;
      let war = Memory.attackinprogress && room.controller.level >= 7 || room.memory.guidedattack;
      let numbuilder = 3;
      let specializedbuilders = 0;
      let numupgrader = 1;
      if (room.memory.haslinks) {
        numbuilder = 0;
        specializedbuilders = 1;
      }
      if (room.storage && room.storage.store.energy > 200000) {
        specializedbuilders = 2;
      } else if (room.storage && room.storage.store.energy < 20000) {
        specializedbuilders = 0;
      } else if (room.controller.level < 3) {
        numbuilder = 7; // 7
      } else if (room.controller.level < 4) {
        numbuilder = 5;
      } else if (room.controller.level < 5) {
        numbuilder = 3;
      }
      let constrsites = room.find(FIND_CONSTRUCTION_SITES);
      if (constrsites.length === 0 && numbuilder > 0) {
        numupgrader += 2;
      }
      if (room.storage && room.storage.store.energy > 300000) {
        specializedbuilders++;
      }
      if (room.storage && room.storage.store.energy > 400000) {
        if (room.controller.level === 8) {
          specializedbuilders++;
        } else {
          numupgrader++;
        }
      }

      // let roles = ['builder', 'upgrader', 'outsider', 'sltrans', 'harvester', 'transporter', 'reserver', 'defender',
      //   'attacker', 'healer', 'specialbuilder', 'mineral', 'mineraltransporter', 'dismantler', 'keeper', 'gatherer', 'Specialdefender', 'looter' ]

      let basicProductionCreepsLength = room.myCreeps.builder.length + room.myCreeps.transporter.length + room.myCreeps.specialbuilder.length;

      var parts;
      var newName;
      var components;
      var creationpossible;

      if (basicProductionCreepsLength === 0) {
        let capa = spawn.room.energyAvailable;
        if (capa < 300) {
          capa = 300;
        }
        if (room.storage && room.storage.store.energy >= 5000) {
          room.log('create transporter with reduced energy');
          parts = creepUtils.createTransporterCreep(spawn, 4);

          newName = spawns[firstfreespawn].createCreep(parts, undefined, { role: 'transporter', home: room.name});
          room.log('Spawning new reduced transporter: ' + newName);
        } else {
          newName = spawns[firstfreespawn].createCreep(creepUtils.createWorkFocussedCreep(spawn, capa), undefined, {role: 'builder', source: getHarvestID(room), home: room.name});
          room.log('Spawning new General Purpuse Creep: ' + newName);
        }
      } else
      if (room.myCreeps.transporter.length < 2 && room.storage && (room.storage.store.energy > 20000 || room.memory.haslinks)) {
        let numCarry = 8;
        if (room.controller.level === 8) {
          numCarry = 32;
        } else if (room.controller.level === 7) {
          numCarry = 16;
        }
        parts = creepUtils.createTransporterCreep(spawn, numCarry);
        newName = spawns[firstfreespawn].createCreep(parts, undefined, { role: 'transporter', home: room.name});
      } else

      if (room.myCreeps.harvester.length < 2 && room.memory.haslinks) {
        parts = [CARRY, CARRY, MOVE, MOVE, WORK, WORK, WORK, WORK, WORK, WORK, WORK];
        newName = spawns[firstfreespawn].createCreep(parts, undefined, {role: 'harvester', home: room.name});
      } else if ((danger && (room.myCreeps.defender.length < Math.min(2, numinvaders))) || (room.myCreeps.defender.length < 1 && slaveRoomInDanger)) {
        newName = spawns[firstfreespawn].createCreep(creepUtils.createRangedCreep(spawn, true), undefined, {role: 'defender', room: room.name, home: room.name, ignoreneutrals: true, wait: false});
        room.log('Spawning new defender: ' + newName);
      } else if (keeperid && keeperid !== '') {
        components = [MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE,
          ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK,
          HEAL, HEAL, HEAL, HEAL, HEAL, HEAL];
        newName = spawns[firstfreespawn].createCreep(components, undefined, {role: 'keeper', room: keeperid, home: room.name});
        room.log('creating keeper was successful? : ' + newName);
      } else if (builders < numbuilder) {
        newName = spawns[firstfreespawn].createCreep(creepUtils.createCreepComponents(spawn), undefined, {role: 'builder', source: getHarvestID(room), home: room.name});
      } else if (specialbuilders < specializedbuilders) {
        newName = spawns[firstfreespawn].createCreep(creepUtils.createWorkFocussedCreep(spawn), undefined, {role: 'specialbuilder', home: room.name});
      } else if (room.memory.claimroom) {
        newName = spawns[firstfreespawn].createCreep([CLAIM, MOVE], undefined, {role: 'claim', room: room.memory.claimroom, home: room.name });
        components = [CLAIM, MOVE];
        creationpossible = spawns[firstfreespawn].canCreateCreep(components);
        if (creationpossible === OK) {
          newName = spawns[firstfreespawn].createCreep([CLAIM, MOVE], undefined, {role: 'claim', room: room.memory.claimroom, home: room.name });
          room.log('Spawning new claimcreep: ' + newName);
          delete room.memory.claimroom;
        } else {
          room.log('Would like to create claimcreep but cannot: ' + creationpossible);
        }
      } else if (war && healers < maxhealers) {
        newName = spawns[firstfreespawn].createCreep(creepUtils.createHealCreep(spawn), undefined, {role: 'healer', room: warroom, home: room.name, gatheringpoint: gatheringpoint, globalguidance: true, boost: true});
        room.log('Spawning new healer: ' + newName);
      } else if (war && attackers < maxattackers) {
        newName = spawns[firstfreespawn].createCreep(creepUtils.createWarCreep(spawn), undefined, {role: 'attacker', room: warroom, home: room.name, gatheringpoint: gatheringpoint, ignoreneutrals: true, globalguidance: true});
        room.log('Spawning new attacker: ' + newName);
      } else if (war && dismantlers < maxdismantlers) {
        newName = spawns[firstfreespawn].createCreep(creepUtils.createDismantleCreep(spawn, 2), undefined, {role: 'dismantler', room: warroom, home: room.name, gatheringpoint: gatheringpoint, globalguidance: true});
        room.log('Spawning new dismantler: ' + newName);
      } else if (upgraders < numupgrader) {
        components = [];
        if (room.storage && room.storage.store.energy < 150000 && room.memory.haslinks) {
          components = [WORK, WORK, CARRY, WORK, MOVE, MOVE];
        } else if (room.controller.level === 8) {
          components = [WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE];
        } else {
          components = creepUtils.createWorkFocussedCreep(spawn);
        }
        // room.log('components for upgrader: ' + JSON.stringify(components));
        newName = spawns[firstfreespawn].createCreep(components, undefined, {role: 'upgrader', home: room.name });
        room.log('Spawning new upgrader: ' + newName);
      } else if (attackers < 1 && room.memory.attackinprogress) {
        let body = creepUtils.createRangedCreep(spawn, true);
        creationpossible = spawns[firstfreespawn].canCreateCreep(body);
        if (creationpossible === OK) {
          newName = spawns[firstfreespawn].createCreep(body, undefined, {role: 'attacker', room: room.memory.warroom, home: room.name});
          room.log('Spawning new ranged attacker: ' + newName);
          // room.memory.attackinprogress = false;
        } else {
          room.log('Would like to create roomwarcreep but cannot: ' + creationpossible);
        }
      } else if (specialdefenders < 1 && room.memory.centralroom) {
        newName = spawns[firstfreespawn].createCreep(creepUtils.createRangedCreep(spawn, true), undefined, {role: 'Specialdefender', room: room.memory.centralroom, home: room.name, ignoreneutrals: true, wait: false});
        room.log('spawning new specialdefender');
      } else if (slaveid && slaveid !== '') {
        let roompos = JSON.parse(slaveid);
        let sourcepos = new RoomPosition(roompos.x, roompos.y, roompos.roomName);

        components = [CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK];

        newName = spawns[firstfreespawn].createCreep(components, undefined, {role: 'outsider', room: roompos.roomName, home: room.name, sourcepos: sourcepos });
        room.log('Spawning new outsider: ' + newName);
      } else if (supporterId && supporterId !== '') { // TODO refactoring only half complete -> Create Support Creep Type.
        let roompos = JSON.parse(supporterId);
        let sourcepos = new RoomPosition(roompos.x, roompos.y, roompos.roomName);
        components = creepUtils.createCreepComponents(spawn);
        newName = spawns[firstfreespawn].createCreep(components, undefined, {role: 'supporter', room: roompos.roomName, home: room.name, sourcepos: sourcepos });
        room.log('Spawning new supporter: ' + newName);
      } else if (slavetransid && slavetransid !== '') { // TODO: remove unnecessary stuff
        let roompos = JSON.parse(slavetransid);
        let sourcepos = new RoomPosition(roompos.x, roompos.y, roompos.roomName);
        sourcepos.container = roompos.container;

        components = creepUtils.createTransporterCreepWithWork(spawn, 24);
        newName = spawns[firstfreespawn].createCreep(components, undefined, {role: 'sltrans', room: roompos.roomName, home: room.name, sourcepos: sourcepos});
        room.log('Spawning new slave Transporter: ' + newName);
      } else if (dumperId && dumperId !== '') { // TODO check why the useage of ''
        let roompos = JSON.parse(dumperId);
        let sourcepos = new RoomPosition(roompos.x, roompos.y, roompos.roomName);
        components = [ WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE];

        newName = spawns[firstfreespawn].createCreep(components, undefined, {role: 'dumper', room: roompos.roomName, home: room.name, sourcepos: sourcepos, nofear: true });
        room.log('Spawning new dumper: ' + newName);
      } else if (keeperTransporterId && keeperTransporterId !== '') {
        let roompos = JSON.parse(keeperTransporterId);
        let sourcepos = new RoomPosition(roompos.x, roompos.y, roompos.roomName);

        components = [WORK, WORK, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE];
        newName = spawns[firstfreespawn].createCreep(components, undefined, {role: 'keepTrans', room: roompos.roomName, home: room.name, sourcepos: sourcepos, nofear: true});
        room.log('Spawning new keeperTransporterId: ' + newName);
      } else if (gathererid && gathererid !== '') {
        components = [WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE];
        newName = spawns[firstfreespawn].createCreep(components, undefined, {role: 'gatherer', room: gathererid, home: room.name, nofear: true});
        // console.log('keeperid: ' + JSON.stringify(keeperid));
        room.log('Spawning new gatherer: ' + newName);
      } else if (roomtoreserve && reserver <= 1) {
        newName = spawns[firstfreespawn].createCreep(creepUtils.createClaimCreep(spawn), undefined, {role: 'reserver', room: roomtoreserve, home: room.name });
        room.log('Spawning new reserver: ' + newName);
      } else if (mineral < 1 && room.terminal && (room.memory.mineralregentime < Game.time)) {
        newName = spawns[firstfreespawn].createCreep(creepUtils.createCreepComponents(spawn), undefined, {role: 'mineral', home: room.name, room: room.name});
        room.log('Spawning new Mineral Creep: ' + newName);
      } else if (room.memory.haslabs && mineraltransporters < 1) {
        newName = spawns[firstfreespawn].createCreep([CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE], undefined, {role: 'mineraltransporter', home: room.name, room: room.name});
        room.log('Spawning new Mineral Transporter: ' + newName);
      } else if (singleroomreserve && reserver <= 1) {
        newName = spawns[firstfreespawn].createCreep(creepUtils.createClaimCreep(spawn), undefined, {role: 'reserver', room: singleroomreserve, home: room.name });
        room.log('Spawning new reserver: ' + newName);
      } else if (looters < 2 && room.memory.lootroom) {
        components = [WORK, WORK, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE];
        newName = spawns[firstfreespawn].createCreep(components, undefined, {role: 'looter', room: room.memory.lootroom, home: room.name });
        room.log('Spawning new loota: ' + newName);
      }
    }

    if (!room.memory.lastlevel) {
      room.memory.lastlevel = 1;
    }
    if (!room.memory.ring) {
      room.memory.ring = 1;
    }
    if (room.memory.lastlevel < room.controller.level) {
      room.log('Level up');
      room.memory.buildstuff = true;
      room.memory.lastlevel = room.controller.level;
      if (room.controller.level >= 6) {
        room.memory.wallshp = 200000;
      }
    }

    if (room.memory.buildstuff) {
      room.log('level up -> build stuff');

      let sx = spawn.pos.x;
      let sy = spawn.pos.y;

      let ring = room.memory.ring;

      console.log('spawnpos:' + sx + '/' + sy);

      for (var x = (sx - ring); x <= (sx + ring); x++) {
        for (var y = (sy - ring); y <= (sy + ring); y++) {
          let pos = new RoomPosition(x, y, room.name);
          if (((x + y) % 2 === 1) && positionFree(pos)) {
            // check all 4 neighboring tiles
            // console.log('Free spot: ' + JSON.stringify(spot));
            let north = new RoomPosition(x, y + 1, room.name);
            let south = new RoomPosition(x, y - 1, room.name);
            let east = new RoomPosition(x + 1, y, room.name);
            let west = new RoomPosition(x - 1, y, room.name);

            let numfree = 0;
            if (positionFree(north)) {
              numfree++;
            }
            if (positionFree(south)) {
              numfree++;
            }
            if (positionFree(east)) {
              numfree++;
            }
            if (positionFree(west)) {
              numfree++;
            }

            if (numfree >= 4) {
              let result = pos.createConstructionSite(STRUCTURE_EXTENSION);
              console.log('Found pos to build at' + pos + ' construction started with: ' + result);

              if (result !== ERR_RCL_NOT_ENOUGH) {
                console.log('try creating construction Site at ' + JSON.stringify(pos) + ' with result ' + result);
              } else {
                pos.createConstructionSite(STRUCTURE_TOWER);
                console.log('already build everything');
                room.memory.buildstuff = false;
                room.memory.ring = 1;
              }
            }
          }
        }
      }

      if (room.memory.buildstuff) {
        room.memory.ring = room.memory.ring + 1;
      }
    }

    let links = room.find(FIND_STRUCTURES, {
      filter: (i) => i.structureType === STRUCTURE_LINK
    });

    if (links.length >= 2 && room.storage) {
      var spawnlink = room.storage.pos.findClosestByRange(links);
      var conlink = room.controller.pos.findClosestByRange(links);

      if (conlink.pos.getRangeTo(room.controller) > 5) {
        // console.log('conlink is too far');
        conlink = null;
      }
      room.memory.haslinks = true;
      var transferdone = false;
      links.forEach(function (link) {
        if (transferdone) {
          // console.log('transfer was already done');
          return;
        }
        if (link.cooldown === 0 && link.energy >= 200) {
          let isspawnlink = false, isconlink = false;
          if (link.pos.x === spawnlink.pos.x && link.pos.y === spawnlink.pos.y) {
            // console.log('link is spawnlink');
            isspawnlink = true;
          }
          if (conlink && link.pos.x === conlink.pos.x && link.pos.y === conlink.pos.y) {
            // console.log('link is conlink');
            isconlink = true;
          }
          if (!isconlink && conlink) {
            // console.log('conlink exist and link is not conlink');
            if (conlink.energy < 600) {
              var maxenergy = Math.min(800 - conlink.energy, link.energy);
              var result = link.transferEnergy(conlink, maxenergy);
              if (result !== OK) {
                console.log('transfer failed because: ' + result);
              }
              transferdone = true;
              return;
            }
          }
          if (!isspawnlink && !isconlink) {
            // console.log('is not spawnlink and not conlink');
            if (spawnlink.energy < 700) {
              var maxenergy = Math.min(800 - spawnlink.energy, link.energy);
              var result = link.transferEnergy(spawnlink, maxenergy);
              if (result !== OK) {
                console.log('transfer failed because: ' + result);
              }
              transferdone = true;
            }
          }
        }
      });
    }

    if (Game.time % 10 === 0) {
      let labs = room.find(FIND_STRUCTURES, {
        filter: (i) => i.structureType === STRUCTURE_LAB
      });
      if (labs.length > 0) {
        room.memory.haslabs = true;

        let fullreaction = function (mineral1, mineral2, result) {
          let lab1 = null;
          let lab2 = null;
          let targets = [];
          labs.forEach(function (lab) {
            if (!lab.mineralType) {
              targets.push(lab);
            } else if (lab.mineralType === mineral1) {
              lab1 = lab;
            } else if (lab.mineralType === mineral2) {
              lab2 = lab;
            } else if (lab.mineralType === result) {
              targets.push(lab);
            }
          });

          if (lab1 && lab2) {
            targets.forEach(function (target) {
              target.runReaction(lab1, lab2);
            });
          }
        };

        if (room.memory.reaction) {
          let reaction = room.memory.reaction;
          fullreaction(reaction.m1, reaction.m2, reaction.res);
        } else {
          // pick a reaction:
          let reaction = findReaction.findFreeReaction();
          if (reaction) {
            room.memory.reaction = reaction;
            room.memory.display = false;
            room.log('newly picking a reaction: ' + reaction);

            Memory.requesting = findReaction.updateRequestingByRoom();
          }
        }
      }
    }
  }

  // console.log('Time:' + Game.time % 100 + ' start: ' + startcpu + ' flags: ' + flagcpu + ' creeps: ' + creepscpu + ' rooms: ' + Game.cpu.getUsed() + 'bucket: ' + Game.cpu.bucket);
};

var positionFree = function (roomposition) {
  if (roomposition.x > 49 || roomposition.x < 1 || roomposition.y > 49 || roomposition.x < 1) {
    console.log('roomposition out of bounds: ' + roomposition);
    return false;
  }
  // console.log('roomposition:' + roomposition)
  let terrain = roomposition.lookFor(LOOK_TERRAIN);
  if (terrain.length > 0 && terrain[0] === 'wall') {
    //  console.log('terrain is wall: ' + JSON.stringify(terrain))
    return false;
  }
  let structure = roomposition.lookFor(LOOK_STRUCTURES);
  if (structure.length > 0 && structure[0].structureType !== STRUCTURE_ROAD) {
    //  console.log('structure on it: ' + JSON.stringify(structure))
    return false;
  }
  let constsite = roomposition.lookFor(LOOK_CONSTRUCTION_SITES);
  if (constsite.length > 0) {
    //  console.log('constsite on it: ' + JSON.stringify(constsite))
    return false;
  }

  return true;
};

var getHarvestID = function (room) {
  let creeplist = room.find(FIND_MY_CREEPS);
  let count1 = creeplist.filter(function (creep) { return creep.memory.source === 1 && (creep.ticksToLive > 100 || creep.spawning) && (creep.memory.role === 'builder' || creep.memory.role === 'upgrader' || creep.memory.role === 'harvester'); }).length;
  let count0 = creeplist.filter(function (creep) { return creep.memory.source === 0 && (creep.ticksToLive > 100 || creep.spawning) && (creep.memory.role === 'builder' || creep.memory.role === 'upgrader' || creep.memory.role === 'harvester'); }).length;
  // console.log('count 0: ' + count0 + ' count1: ' + count1);
  let res = (count1 >= count0) ? 0 : 1;
  // console.log('Target source for new creep:' + res);

  return res;
};
