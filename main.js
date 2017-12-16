
let handleFlags = require('handleFlags')
let moveCreeps = require('moveCreeps')
let sellResources = require('sellResources')
let overridePrototypes = require('OverridePrototypes')

module.exports.loop = function () {
  let startcpu = Game.cpu.getUsed()

  overridePrototypes.overridePrototypes()

  for (let name in Memory.creeps) {
    if (!Game.creeps[name]) {
      delete Memory.creeps[name]
    }
  }
  for (let name in Memory.flags) {
    if (!Game.flags[name]) {
      delete Memory.flags[name]
    }
  }

  let gatheringpoint = Memory.gatheringpoint
  let warroom = null
  let attackingcreeps = _.filter(Game.creeps, (creep) => creep.memory.role === 'attacker' || creep.memory.role === 'healer' || creep.memory.role === 'dismantler')

  handleFlags.handleflags()

  let flagcpu = Game.cpu.getUsed()

  // Global level decisions

  if (Memory.warroom) {
    warroom = Memory.warroom
  }

  attackingcreeps.forEach(function (creep) {
    // console.log('creep:' +creep.name);
    if (creep.memory.globalguidance) {
      creep.memory.room = warroom
      creep.memory.gatheringpoint = gatheringpoint
    }
  })

  if (!Memory.masterroom) {
    Memory.masterroom = Game.spawns.Spawn1.room.name
  }

  if (Game.time % 100 === 3 || !Memory.energytarget) {
    let mincontrollerlevel = 8
    let progress = 0
    let roomname = ''
    for (let room_id in Game.rooms) {
      let room = Game.rooms[room_id]
      if (room.controller && room.controller.my && room.controller.level < 8 && room.controller.level < mincontrollerlevel && room.terminal) {
        roomname = room.name
        mincontrollerlevel = room.controller.level
        progress = room.controller.progress
      } else if (room.controller && room.controller.my && room.controller.level < 8 && room.controller.level === mincontrollerlevel && room.controller.progress < progress && room.terminal) {
        roomname = room.name
        mincontrollerlevel = room.controller.level
        progress = room.controller.progress
      }
    }
    if (roomname) {
      console.log('room:' + roomname + 'is the lowest with a terminal with progress ' + mincontrollerlevel + ':' + progress)
      Memory.energytarget = roomname
    }
  }

  moveCreeps.moveCreeps()

  let creepscpu = Game.cpu.getUsed()

  let targets
  for (let room_id in Game.rooms) {
    let room = Game.rooms[room_id]

    if (!room.controller || !room.controller.my) {
      // no room with a controller -> do nothing
      continue
    }

    // controller required but no spawn
    if (!room.memory.wallshp) {
      room.memory.wallshp = 100000
    }

    let roomname = room.name

    // activate safemode

    let danger = false
    targets = room.findHostileCreeps()
    let numinvaders = targets.length

    let towers = room.find(FIND_MY_STRUCTURES, {
      filter: (structure) => {
        return (structure.structureType === STRUCTURE_TOWER)
      }
    })

    if (targets.length >= 1) {
      danger = true
      room.memory.dangertill = Game.time + 50
      console.log('setting dangertill')

      // TODO add condition that this code part isn't reached every single tick.
      if (towers.length === 0) {
        let result = room.controller.activateSafeMode()
        console.log('activated safe mode because no towers were there:' + result)
      } else if (targets.length > 3 && room.controller.level < 8) {
        let result = room.controller.activateSafeMode()
        console.log('activated safe mode because 4 opponents are scary:' + result)
      } else if (targets.length > 5) {
        let result = room.controller.activateSafeMode()
        console.log('activated safe mode because 6 opponents are scary:' + result)
      }

      towers.forEach(function (tower) {
        let hostileCreeps = room.findHostileCreeps()
        let closest = tower.pos.findClosestByRange(hostileCreeps)
        console.log('attacking closest enemy')
        tower.attack(closest)
      })
    } else {
      let damagedCreeps = room.findFriendlyDamagedCreeps();

      if (damagedCreeps.length > 0) {
        towers.forEach(function (tower) {
          let closestCreep = tower.pos.findClosestByRange(damagedCreeps)
          if (closestCreep) {
            tower.heal(closestCreep)
          }
        })
      }
    }

    let spawns = room.find(FIND_MY_SPAWNS)
    let spawn = spawns[0]
    if (!spawn) {
      continue
    }

    // terminal

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

    // sell ressources
    if (Game.time % 50 === 1) {
      //    sellResources.sellResources()
    }
    /* if (room.name === "W15N67" && Game.time %50 === 9){
            var oxygen = room.terminal.store[RESOURCE_LEMERGIUM];
            room.log('lem: ' + JSON.stringify(oxygen));
            if ( (!oxygen || oxygen < 10000) && room.terminal.store.energy >= 30000){
                var orders = Game.market.getAllOrders().filter(function(order){
                     return order.resourceType === RESOURCE_LEMERGIUM && order.type === ORDER_SELL && Game.market.calcTransactionCost(1000, room.name, order.roomName) < 2000;
                });
                // console.log('orders:' + JSON.stringify(orders));

                var price = 1;
                var orderid = null;
                var maxamount = 0;
                orders.forEach(function(order){
                    if (order.price < price){
                        price = order.price;
                        orderid = order.id;
                        maxamount = order.amount;
                    }
                });
                if (orderid){

                    var amount = Math.min(maxamount, 15000);
                    room.log('orderid: '  +orderid + 'amountl' +  amount + 'price'+ price);
                    var result = Game.market.deal(orderid, amount, room.name);
                    room.log('buying L: ' + amount + ' result: ' + result);
                }
            }
        } */

    // mineralregen
    if (!room.memory.mineralregentime) {
      room.memory.mineralregentime = Game.time - 1
    }

    // display

    if (!room.memory.reaction) {
      room.memory.display = true
    }

    // slaveroomlogic
    var slaveroomindanger = false
    var endangeredslaveroom = ''
    if (room.memory.slaverooms && room.memory.slaverooms.length > 0) {
      room.memory.slaverooms.forEach(function (slaveroom, index) {
        if (!slaveroom) {
          return
        }
        // TODO: calculate distance

        let room2 = Game.rooms[slaveroom.roomName]
        // console.log('room2.memory.dangertill' + room2.memory.dangertill);

        if (room2 && room2.memory.dangertill && (room2.memory.dangertill > Game.time)) {
          slaveroomindanger = true
          // console.log(room.name + ': slaveroom ' + slaveroom.roomName + ' is in danger');
          endangeredslaveroom = slaveroom.roomName
        }
        let stupportTill = room.controller.level >= 5 ? 3 : 2
        if (room2 && room2.controller && room2.controller.level > stupportTill) {
          // room is self sustainable -> remove help
          room.memory.slaverooms.splice(index, 1)
          room.log('freeing slaveroom because it needs no help: ' + endangeredslaveroom)
        }
      })
    }
    if (endangeredslaveroom) {
      room.log('endangered slaveroom is: ' + endangeredslaveroom)

      var defenders = _.filter(Game.creeps, (creep) => creep.memory.home === room.name && creep.memory.role === 'defender')
      defenders.forEach(function (creep) {
        creep.memory.room = endangeredslaveroom
      })
    }

    // getting first free spawn
    let firstfreespawn = -1
    if (spawns[0] && !spawns[0].spawning) {
      firstfreespawn = 0
    } else if (spawns[1] && !spawns[1].spawning) {
      firstfreespawn = 1
    } else if (spawns[2] && !spawns[2].spawning) {
      firstfreespawn = 2
    }

    if (firstfreespawn >= 0) {
      let roomcreeps = _.filter(Game.creeps, (creep) => creep.memory.home === room.name && (creep.ticksToLive > 100 || creep.spawning))
      // console.log(JSON.stringify(roomcreeps));
      var builders = 0, upgraders = 0, harvesters = 0, transporters = 0, reserver = 0, defenders = 0, attackers = 0, healers = 0,
        specialbuilders = 0, mineral = 0, mineraltransporters = 0, dismantlers = 0, specialdefenders = 0, looters = 0
      var slaves = {}
      var slavetransporter = {}
      var reserving = {}
      var keepers = {}
      var gatherers = {}

      if (room.memory.slaverooms) {
        room.memory.slaverooms.forEach(function (roompos) {
          if (!roompos) {
            return
          }
          // var roomName = roompos.roomName + ',' + roompos.x +',' + roompos.y;
          let roomName = JSON.stringify(roompos)
          slaves[roomName] = 0
          if (roompos.container) {
            slavetransporter[roomName] = 0
          }
        })
      }

      if (room.memory.keeperrooms) {
        room.memory.keeperrooms.forEach(function (roomname) {
          keepers[roomname] = 0
          gatherers[roomname] = 0
        })
      }

      roomcreeps.forEach(function (creep) {
        if (creep.memory.role === 'builder') {
          builders++
        } else if (creep.memory.role === 'upgrader') {
          upgraders++
        } else if (creep.memory.role === 'outsider') {
          var roomName = JSON.stringify(creep.memory.sourcepos)
          // console.log('roomname: ' + roomName);
          if (slaves[roomName]) {
            slaves[roomName] = slaves[roomName] + 1
          } else {
            slaves[roomName] = 1
          }
        } else if (creep.memory.role === 'sltrans') {
          var roomName = JSON.stringify(creep.memory.containerpos)
          if (slavetransporter[roomName]) {
            slavetransporter[roomName] = slavetransporter[roomName] + 1
          } else {
            slavetransporter[roomName] = 1
          }
        } else if (creep.memory.role === 'harvester') {
          harvesters++
        } else if (creep.memory.role === 'transporter') {
          transporters++
        } else if (creep.memory.role === 'reserver') {
          reserver++
          var roomName = creep.memory.room
          reserving[roomName] = true
        } else if (creep.memory.role === 'defender') {
          defenders++
        } else if (creep.memory.role === 'attacker') {
          attackers++
        } else if (creep.memory.role === 'healer') {
          healers++
        } else if (creep.memory.role === 'specialbuilder') {
          specialbuilders++
        } else if (creep.memory.role === 'mineral') {
          mineral++
        } else if (creep.memory.role === 'mineraltransporter') {
          mineraltransporters++
        } else if (creep.memory.role === 'dismantler') {
          dismantlers++
        } else if (creep.memory.role === 'keeper') {
          if (creep.ticksToLive > 200 || creep.spawning) {
            var roomName = creep.memory.room
            if (keepers[roomName]) {
              keepers[roomName]++
            } else {
              keepers[roomName] = 1
            }
          }
        } else if (creep.memory.role === 'gatherer') {
          if (creep.ticksToLive > 200 || creep.spawning) {
            var roomName = creep.memory.room
            if (gatherers[roomName]) {
              gatherers[roomName]++
            } else {
              gatherers[roomName] = 1
            }
          }
        } else if (creep.memory.role === 'Specialdefender') {
          specialdefenders++
        } else if (creep.memory.role === 'looter') {
          looters++
        }
      })

      // console.log('slaves' + JSON.stringify(slaves));
      // console.log('slavetransporter ' + JSON.stringify(slavetransporter));
      // console.log('keepers' + JSON.stringify(keepers));
      // console.log('gatherers' + JSON.stringify(gatherers));

      let slaveid = ''
      for (var x in slaves) {
        if (slaves[x] < 1) {
          slaveid = x
        }
      }
      let slavetransid = ''
      for (var x in slavetransporter) {
        if (slavetransporter[x] < 1) {
          slavetransid = x
        }
      }

      let keeperid = ''
      for (var x in keepers) {
        if (keepers[x] < 1) {
          keeperid = x
        }
      }

      let gathererid = ''
      for (var x in gatherers) {
        if (gatherers[x] < 1) {
          gathererid = x
        }
      }

      let roomtoreserve = null
      let singleroomreserve = null

      // console.log('reserving: ' + JSON.stringify(reserving));

      for (var y in room.memory.slaverooms) {
        let name = room.memory.slaverooms[y].roomName
        let claimroom = Game.rooms[name]

        if (claimroom && claimroom.controller) {
          // console.log('controller is here');
          // console.log('claimroom.controller.reservation: ' + JSON.stringify(claimroom.controller.reservation) + ' owner: ' + claimroom.controller.owner + ' sources: ' + claimroom.memory.sources.length);
          if ((!claimroom.controller.reservation || claimroom.controller.reservation.ticksToEnd < 1000) && !reserving[name] && claimroom.memory.sources.length === 2 && !claimroom.controller.owner) {
            roomtoreserve = name
            // console.log('found room to reserve');
          } else if ((!claimroom.controller.reservation || claimroom.controller.reservation.ticksToEnd < 1000) && !reserving[name] && claimroom.memory.sources.length === 1 && !claimroom.controller.owner) {
            singleroomreserve = name
          }
        }
      }
      // console.log('roomtoreserve:' + roomtoreserve);

      let maxattackers = 1
      let maxhealers = 3
      let maxdismantlers = 2
      if (attackers >= maxattackers && healers >= maxhealers && dismantlers >= maxdismantlers) {
        // Memory.attackinprogress = false;
        room.memory.guidedattack = false
      }
      // Memory.attackinprogress = false;
      let war = Memory.attackinprogress && room.controller.level >= 7 || room.memory.guidedattack
      let numbuilder = 3
      let specializedbuilders = 0
      let numupgrader = 1
      if (room.memory.haslinks) {
        numbuilder = 0
        specializedbuilders = 1
      }
      if (room.storage && room.storage.store.energy > 200000) {
        specializedbuilders = 2
      } else if (room.storage && room.storage.store.energy < 20000) {
        specializedbuilders = 0
      } else if (room.controller.level < 3) {
        numbuilder = 7 // 7
      } else if (room.controller.level < 4) {
        numbuilder = 5
      } else if (room.controller.level < 5) {
        numbuilder = 3
      }
      let constrsites = room.find(FIND_CONSTRUCTION_SITES)
      if (constrsites.length === 0 && numbuilder > 0) {
        numupgrader += 2
      }
      if (room.storage && room.storage.store.energy > 300000) {
        specializedbuilders++
      }
      if (room.storage && room.storage.store.energy > 400000) {
        if (room.controller.level === 8) {
          specializedbuilders++
        } else {
          numupgrader++
        }
      }

      let normalcreeps = roomcreeps.filter(function (creep) {
        return creep.memory.role !== 'outsider' && creep.memory.role !== 'defender' && creep.memory.role !== 'attacker' && creep.memory.role !== 'sltrans'
      })
      if (normalcreeps.length > 0) {
        // console.log('normalcreeprole: ' +normalcreeps[0].memory.role);
      }

      if (normalcreeps.length === 0) {
        let capa = spawn.room.energyAvailable
        if (capa < 300) {
          capa = 300
        }
        if (room.storage && room.storage.store.energy >= 5000) {
          room.log('create transporter with reduced energy')
          var parts = [MOVE, MOVE, CARRY, CARRY, CARRY, CARRY]

          var newName = spawns[firstfreespawn].createCreep(parts, undefined, { role: 'transporter', home: room.name})
          room.log('Spawning new reduced transporter: ' + newName)
        } else {
          var newName = spawns[firstfreespawn].createCreep(createWorkFocussedCreep(spawn, capa), undefined, {role: 'builder', source: getHarvestID(room), home: room.name})
          room.log('Spawning new General Purpuse Creep: ' + newName)
        }
      } else
      if (transporters < 2 && room.storage && (room.storage.store.energy > 20000 || room.memory.haslinks)) {
        var parts = [MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY]
        if (room.controller.level === 8) {
          parts = [MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY]
        } else if (room.controller.level > 6) {
          parts = [MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY]
        }
        var newName = spawns[firstfreespawn].createCreep(parts, undefined, { role: 'transporter', home: room.name})
        room.log('Spawning new transporter: ' + newName)
      } else

      if (harvesters < 2 && room.memory.haslinks) {
        var parts = [CARRY, CARRY, MOVE, MOVE, WORK, WORK, WORK, WORK, WORK, WORK, WORK]
        var newName = spawns[firstfreespawn].createCreep(parts, undefined, {role: 'harvester', home: room.name})
        room.log('Spawning new harvester: ' + newName)
      } else if (danger && ((defenders < 2 && defenders < numinvaders) || (defenders < 1 && slaveroomindanger))) {
        var newName = spawns[firstfreespawn].createCreep(createRangedCreep(spawn), undefined, {role: 'defender', room: room.name, home: room.name, ignoreneutrals: true, wait: false})
        room.log('Spawning new defender: ' + newName)
      } else if (keeperid && keeperid !== '') {
        var components = [MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE,
          ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK,
          HEAL, HEAL, HEAL, HEAL, HEAL, HEAL]
        var newName = spawns[firstfreespawn].createCreep(components, undefined, {role: 'keeper', room: keeperid, home: room.name})
        // console.log('keeperid: ' + JSON.stringify(keeperid));
        room.log('Spawning new keeper: ' + newName)
      } else if (builders < numbuilder) {
        var newName = spawns[firstfreespawn].createCreep(createCreepComponents(spawn), undefined, {role: 'builder', source: getHarvestID(room), home: room.name})
        room.log('Spawning new General Purpuse Creep: ' + newName)
      } else if (specialbuilders < specializedbuilders) {
        var newName = spawns[firstfreespawn].createCreep(createWorkFocussedCreep(spawn), undefined, {role: 'specialbuilder', home: room.name})
        room.log('Spawning new specialbuilder from storage: ' + newName)
      } else if (room.memory.claimroom) {
        var newName = spawns[firstfreespawn].createCreep([CLAIM, MOVE], undefined, {role: 'claim', room: room.memory.claimroom, home: room.name })
        var components = [CLAIM, MOVE]
        var creationpossible = spawns[firstfreespawn].canCreateCreep(components)
        if (creationpossible === OK) {
          var newName = spawns[firstfreespawn].createCreep([CLAIM, MOVE], undefined, {role: 'claim', room: room.memory.claimroom, home: room.name })
          console.log('Spawning new claimcreep: ' + newName)
          delete room.memory.claimroom
          // room.memory.attackinprogress = false;
        } else {
          console.log('Would like to create claimcreep but cannot: ' + creationpossible)
        }
      } else if (war && healers < maxhealers) {
        var newName = spawns[firstfreespawn].createCreep(createHealCreep(spawn), undefined, {role: 'healer', room: warroom, home: room.name, gatheringpoint: gatheringpoint, globalguidance: true, boost: true})
        room.log('Spawning new healer: ' + newName)
      } else if (war && attackers < maxattackers) {
        var newName = spawns[firstfreespawn].createCreep(createWarCreep(spawn), undefined, {role: 'attacker', room: warroom, home: room.name, gatheringpoint: gatheringpoint, ignoreneutrals: true, globalguidance: true})
        room.log('Spawning new attacker: ' + newName)
      } else if (war && dismantlers < maxdismantlers) {
        var newName = spawns[firstfreespawn].createCreep(createDismantleCreep(spawn, 2), undefined, {role: 'dismantler', room: warroom, home: room.name, gatheringpoint: gatheringpoint, globalguidance: true})
        room.log('Spawning new dismantler: ' + newName)
      } else if (upgraders < numupgrader) {
        var components = []
        if (room.storage && room.storage.store.energy < 150000 && room.memory.haslinks) {
          components = [WORK, WORK, CARRY, WORK, MOVE, MOVE]
        } else if (room.controller.level === 8) {
          components = [WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE]
        } else {
          components = createWorkFocussedCreep(spawn)
        }
        room.log('components for upgrader: ' + JSON.stringify(components))
        var newName = spawns[firstfreespawn].createCreep(components, undefined, {role: 'upgrader', home: room.name })
        room.log('Spawning new upgrader: ' + newName)
      } else if (attackers < 1 && room.memory.attackinprogress) {
        let body = createRangedCreep(spawn)
        var creationpossible = spawns[firstfreespawn].canCreateCreep(body)
        if (creationpossible === OK) {
          var newName = spawns[firstfreespawn].createCreep(body, undefined, {role: 'attacker', room: room.memory.warroom, home: room.name})
          room.log('Spawning new ranged attacker: ' + newName)
          // room.memory.attackinprogress = false;
        } else {
          room.log('Would like to create roomwarcreep but cannot: ' + creationpossible)
        }
      } else if (specialdefenders < 1 && room.memory.centralroom) {
        var newName = spawns[firstfreespawn].createCreep(createRangedCreep(spawn, true), undefined, {role: 'Specialdefender', room: room.memory.centralroom, home: room.name, ignoreneutrals: true, wait: false})
        room.log('spawning new specialdefender')
      } else if (slaveid && slaveid !== '') {
        var roompos = JSON.parse(slaveid)
        var sourcepos = new RoomPosition(roompos.x, roompos.y, roompos.roomName)

        var roomname = roompos.roomName
        var cords = roomname.substr(1).replace('N', ',').replace('S', ',').split(',')
        console.log('cords: ' + JSON.stringify(cords))
        var centralroom = false
        if (Number(cords[0]) % 10 > 3 && Number(cords[0]) % 10 < 7 && Number(cords[1]) % 10 > 3 && Number(cords[1]) % 10 < 7) {
          centralroom = true
          console.log('central room')
        }

        var components = []
        if (roompos.container && !centralroom) {
          components = [CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK]
        } else if (roompos.container && centralroom) {
          components = [CARRY, CARRY, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE]
        } else {
          components = createCreepComponents(spawn)
        }
        let dump = !!roompos.container
        sourcepos.container = roompos.container

        var newName = spawns[firstfreespawn].createCreep(components, undefined, {role: 'outsider', room: roompos.roomName, home: room.name, sourcepos: sourcepos, dump: dump, nofear: centralroom })
        room.log('Spawning new outsider: ' + newName)
      } else if (slavetransid && slavetransid !== '') {
        var roompos = JSON.parse(slavetransid)
        var sourcepos = new RoomPosition(roompos.x, roompos.y, roompos.roomName)
        sourcepos.container = roompos.container

        var roomname = roompos.roomName
        var cords = roomname.substr(1).replace('N', ',').replace('S', ',').split(',')
        var centralroom = false
        if (Number(cords[0]) % 10 > 3 && Number(cords[0]) % 10 < 7 && Number(cords[1]) % 10 > 3 && Number(cords[1]) % 10 < 7) {
          centralroom = true
          room.log('central room')
        }

        var components = centralroom ? [WORK, WORK, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE]
          : [WORK, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE]

        var newName = spawns[firstfreespawn].createCreep(components, undefined, {role: 'sltrans', room: roompos.roomName, home: room.name, containerpos: sourcepos, nofear: centralroom})
        room.log('Spawning new slavetransporter: ' + newName)
      } else if (gathererid && gathererid !== '') {
        var components = [WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE]
        var newName = spawns[firstfreespawn].createCreep(components, undefined, {role: 'gatherer', room: gathererid, home: room.name, nofear: true})
        // console.log('keeperid: ' + JSON.stringify(keeperid));
        room.log('Spawning new gatherer: ' + newName)
      } else if (roomtoreserve && reserver <= 1) {
        var newName = spawns[firstfreespawn].createCreep(createClaimCreep(spawn), undefined, {role: 'reserver', room: roomtoreserve, home: room.name })
        room.log('Spawning new reserver: ' + newName)
      } else if (mineral < 1 && room.terminal && (room.memory.mineralregentime < Game.time)) {
        var newName = spawns[firstfreespawn].createCreep(createCreepComponents(spawn), undefined, {role: 'mineral', home: room.name, room: room.name})
        room.log('Spawning new Mineral Creep: ' + newName)
      } else if (room.memory.haslabs && mineraltransporters < 1) {
        var newName = spawns[firstfreespawn].createCreep([CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE], undefined, {role: 'mineraltransporter', home: room.name, room: room.name})
        room.log('Spawning new Mineral Transporter: ' + newName)
      } else if (singleroomreserve && reserver <= 1) {
        var newName = spawns[firstfreespawn].createCreep(createClaimCreep(spawn), undefined, {role: 'reserver', room: singleroomreserve, home: room.name })
        room.log('Spawning new reserver: ' + newName)
      } else if (looters < 2 && room.memory.lootroom) {
        var components = [WORK, WORK, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE]
        var newName = spawns[firstfreespawn].createCreep(components, undefined, {role: 'looter', room: room.memory.lootroom, home: room.name })
        room.log('Spawning new loota: ' + newName)
      }
    }

    if (!room.memory.lastlevel) {
      room.memory.lastlevel = 1
    }
    if (!room.memory.ring) {
      room.memory.ring = 1
    }
    if (room.memory.lastlevel < room.controller.level) {
      room.log('Level up')
      room.memory.buildstuff = true
      room.memory.lastlevel = room.controller.level
      if (room.controller.level >= 6) {
        room.memory.wallshp = 200000
      }
    }

    if (room.memory.buildstuff) {
      room.log('level up -> build stuff')

      let sx = spawn.pos.x
      let sy = spawn.pos.y

      let ring = room.memory.ring

      console.log('spawnpos:' + sx + '/' + sy)

      for (var x = (sx - ring); x <= (sx + ring); x++) {
        for (var y = (sy - ring); y <= (sy + ring); y++) {
          let pos = new RoomPosition(x, y, room.name)
          if (((x + y) % 2 === 1) && positionFree(pos)) {
            // check all 4 neighboring tiles
            // console.log('Free spot: ' + JSON.stringify(spot));
            let north = new RoomPosition(x, y + 1, room.name)
            let south = new RoomPosition(x, y - 1, room.name)
            let east = new RoomPosition(x + 1, y, room.name)
            let west = new RoomPosition(x - 1, y, room.name)

            let numfree = 0
            if (positionFree(north)) {
              numfree++
            }
            if (positionFree(south)) {
              numfree++
            }
            if (positionFree(east)) {
              numfree++
            }
            if (positionFree(west)) {
              numfree++
            }

            if (numfree >= 4) {
              let result = pos.createConstructionSite(STRUCTURE_EXTENSION)
              console.log('Found pos to build at' + pos + ' construction started with: ' + result)

              if (result !== ERR_RCL_NOT_ENOUGH) {
                console.log('try creating construction Site at ' + JSON.stringify(pos) + ' with result ' + result)
              } else {
                pos.createConstructionSite(STRUCTURE_TOWER)
                console.log('already build everything')
                room.memory.buildstuff = false
                room.memory.ring = 1
              }
            }
          }
        }
      }

      if (room.memory.buildstuff) {
        room.memory.ring = room.memory.ring + 1
      }
    }

    let links = room.find(FIND_STRUCTURES, {
      filter: (i) => i.structureType === STRUCTURE_LINK
    })

    if (links.length >= 2 && room.storage) {
      var spawnlink = room.storage.pos.findClosestByRange(links)
      var conlink = room.controller.pos.findClosestByRange(links)

      if (conlink.pos.getRangeTo(room.controller) > 5) {
        // console.log('conlink is too far');
        conlink = null
      }
      room.memory.haslinks = true
      var transferdone = false
      links.forEach(function (link) {
        if (transferdone) {
          // console.log('transfer was already done');
          return
        }
        if (link.cooldown === 0 && link.energy >= 200) {
          let isspawnlink = false, isconlink = false
          if (link.pos.x === spawnlink.pos.x && link.pos.y === spawnlink.pos.y) {
            // console.log('link is spawnlink');
            isspawnlink = true
          }
          if (conlink && link.pos.x === conlink.pos.x && link.pos.y === conlink.pos.y) {
            // console.log('link is conlink');
            isconlink = true
          }
          if (!isconlink && conlink) {
            // console.log('conlink exist and link is not conlink');
            if (conlink.energy < 600) {
              var maxenergy = Math.min(800 - conlink.energy, link.energy)
              var result = link.transferEnergy(conlink, maxenergy)
              if (result !== OK) {
                console.log('transfer failed because: ' + result)
              }
              transferdone = true
              return
            }
          }
          if (!isspawnlink && !isconlink) {
            // console.log('is not spawnlink and not conlink');
            if (spawnlink.energy < 700) {
              var maxenergy = Math.min(800 - spawnlink.energy, link.energy)
              var result = link.transferEnergy(spawnlink, maxenergy)
              if (result !== OK) {
                console.log('transfer failed because: ' + result)
              }
              transferdone = true
            }
          }
        }
      })
    }

    var labs = room.find(FIND_STRUCTURES, {
      filter: (i) => i.structureType === STRUCTURE_LAB
    })
    if (labs.length > 0 && Game.time % 10 === 0) {
      room.memory.haslabs = true

      let requesting = {}
      requesting.O = ['W15N67']
      requesting.L = ['W15N67', 'W17N68']
      requesting.Z = ['W14N69']
      requesting.H = ['W14N69']
      requesting.LO = ['W12N69', 'W13N65']
      requesting.ZH2O = ['W12N69', 'W13N65']
      requesting.ZHO2 = ['W12N69', 'W13N65']
      requesting.ZH = ['W13N65']
      requesting.Z = ['W19N66']
      requesting.K = ['W19N66']
      requesting.U = ['W17N68']
      Memory.requesting = requesting

      let fullreaction = function (mineral1, mineral2, result) {
        let lab1 = null
        let lab2 = null
        let targets = []
        labs.forEach(function (lab) {
          if (!lab.mineralType) {
            targets.push(lab)
          } else if (lab.mineralType === mineral1) {
            lab1 = lab
          } else if (lab.mineralType === mineral2) {
            lab2 = lab
          } else if (lab.mineralType === result) {
            targets.push(lab)
          }
        })

        if (lab1 && lab2) {
          targets.forEach(function (target) {
            target.runReaction(lab1, lab2)
          })
        }
      }

      if (room.name === 'W13N65') {
        var reaction = {}
        reaction.m1 = 'H'
        reaction.m2 = 'Z'
        reaction.res = 'ZH'
        // room.memory.reaction = reaction;
        room.memory.reaction = null
        // fullreaction(reaction.m1, reaction.m2, reaction.res);
      } else if (room.name === 'W15N67') {
        var reaction = {}
        reaction.m1 = 'O'
        reaction.m2 = 'L'
        reaction.res = 'LO'
        room.memory.reaction = reaction
        fullreaction(reaction.m1, reaction.m2, reaction.res)
      } else if (room.name === 'W14N69') {
        // room.log('hi');
        var reaction = {}
        reaction.m1 = 'Z'
        reaction.m2 = 'H'
        reaction.res = 'ZH'
        room.memory.reaction = reaction
        fullreaction(reaction.m1, reaction.m2, reaction.res)
      } else if (room.name === 'W19N66') {
        var reaction = {}
        reaction.m1 = 'Z'
        reaction.m2 = 'K'
        reaction.res = 'ZK'
        room.memory.reaction = reaction
        fullreaction(reaction.m1, reaction.m2, reaction.res)
      } else if (room.name === 'W17N68') {
        var reaction = {}
        reaction.m1 = 'U'
        reaction.m2 = 'L'
        reaction.res = 'UL'
        room.memory.reaction = reaction
        fullreaction(reaction.m1, reaction.m2, reaction.res)
      }
    }
  }

  console.log('Time:' + Game.time % 100 + ' start: ' + startcpu + ' flags: ' + flagcpu + ' creeps: ' + creepscpu + ' rooms: ' + Game.cpu.getUsed() + 'bucket: ' + Game.cpu.bucket)
}

var createCreepComponents = function (spawn, maxcapacity) {
  let capacity = spawn.room.energyCapacityAvailable
  if (maxcapacity && capacity > maxcapacity) {
    capacity = maxcapacity
  }

  if (capacity >= 3300) {
    capacity = 3300
  }
  // capacity = spawn.room.energyAvailable;
  // console.log('Room capacity' + capacity);
  let components = [CARRY, MOVE, WORK]
  let remainingcapacity = capacity - 200

  while (remainingcapacity >= 200) {
    components.push(WORK)
    components.push(MOVE)
    components.push(CARRY)
    remainingcapacity = remainingcapacity - 200
  }

  while (remainingcapacity >= 150) {
    components.push(WORK)
    components.push(MOVE)
    remainingcapacity = remainingcapacity - 150
  }

  while (remainingcapacity >= 100) {
    components.push(MOVE)
    components.push(CARRY)
    remainingcapacity = remainingcapacity - 100
  }
  // console.log(JSON.stringify(components));
  // components.
  return components
}

var createWorkFocussedCreep = function (spawn, maxcapacity) {
  let capacity = spawn.room.energyCapacityAvailable
  if (maxcapacity && capacity > maxcapacity) {
    capacity = maxcapacity
  }

  let work = 1
  let move = 1
  let carry = 1

  let components = []

  if (capacity >= 3500) {
    capacity = 3500
  }
  let remainingcapacity = capacity - 200

  while (remainingcapacity >= 450) {
    work += 3
    move += 2
    carry++
    remainingcapacity -= 450
  }

  while (remainingcapacity >= 200) {
    work++
    move++
    carry++
    remainingcapacity -= 200
  }

  while (remainingcapacity >= 150) {
    work++
    move++
    remainingcapacity = remainingcapacity - 150
  }

  while (remainingcapacity >= 100) {
    move++
    carry++
    remainingcapacity = remainingcapacity - 100
  }
  for (var i = 0; i < carry; i++) {
    components.push(CARRY)
  }

  for (var i = 0; i < work; i++) {
    components.push(WORK)
  }
  for (var i = 0; i < move; i++) {
    components.push(MOVE)
  }

  // console.log(JSON.stringify(components));
  return components
}

// createDismantleCreep

var createDismantleCreep = function (spawn, boostlevel) {
  // boostlevel 1 , 2, 3
  let capacity = spawn.room.energyCapacityAvailable
  var boostlevel = boostlevel || 0

  let work = 0
  let move = 0
  let parts = 0

  let components = []
  let remainingcapacity = capacity

  while (remainingcapacity >= 150 && parts <= 48) {
    work += boostlevel + 1
    move++
    parts += 2 + boostlevel
    remainingcapacity = remainingcapacity - 150 - 100 * boostlevel
  }

  if (parts > 50) {
    work = work - parts + 50
  }

  for (var i = 0; i < move; i++) {
    components.push(MOVE)
  }
  for (var i = 0; i < work; i++) {
    components.push(WORK)
  }

  console.log(JSON.stringify(components))
  return components
}

var createWarCreep = function (spawn) {
  let capacity = spawn.room.energyCapacityAvailable
  console.log(capacity)

  if (capacity > 3250) {
    capacity = 3250
  }

  let tough = 0
  let move = 0
  let attack = 0

  let remainingcapacity = capacity

  while (remainingcapacity >= 130) {
    move++
    attack++
    remainingcapacity -= 130
  }
  while (remainingcapacity >= 60) {
    tough++
    move++
    remainingcapacity -= 60
  }

  let components = []

  for (var i = 0; i < tough; i++) {
    components.push(TOUGH)
  }
  for (var i = 0; i < move; i++) {
    components.push(MOVE)
  }
  for (var i = 0; i < attack; i++) {
    components.push(ATTACK)
  }

  // console.log(JSON.stringify(components));
  return components
}

var createRangedCreep = function (spawn, someheal) {
  let capacity = spawn.room.energyCapacityAvailable
  console.log(capacity)

  let tough = 0
  let move = 0
  let rangedattack = 0
  let parts = 0
  let heal = 0
  let remainingcapacity = capacity

  if (someheal) {
    parts = 2
    heal = 2
    remainingcapacity = capacity - 500
  }

  while (remainingcapacity >= 200 && parts <= 48) {
    move++
    rangedattack++
    remainingcapacity -= 200
    parts += 2
  }
  while (remainingcapacity >= 60 && parts <= 48) {
    tough++
    move++
    remainingcapacity -= 60
    parts += 2
  }

  let components = []

  for (var i = 0; i < tough; i++) {
    components.push(TOUGH)
  }

  for (var i = 0; i < move; i++) {
    components.push(MOVE)
  }
  for (var i = 0; i < rangedattack; i++) {
    components.push(RANGED_ATTACK)
  }
  for (var i = 0; i < heal; i++) {
    components.push(HEAL)
  }
  console.log(JSON.stringify(components))
  return components
}

var createHealCreep = function (spawn) {
  let capacity = spawn.room.energyCapacityAvailable
  // console.log(capacity);

  let tough = 0
  let move = 0
  let heal = 0
  let parts = 0

  let remainingcapacity = capacity

  while (remainingcapacity >= 300 && parts <= 48) {
    move++
    heal++
    parts += 2
    remainingcapacity -= 300
  }
  while (remainingcapacity >= 60 && parts <= 48) {
    tough++
    move++
    remainingcapacity -= 60
    parts += 2
  }

  let components = []

  for (var i = 0; i < tough; i++) {
    components.push(TOUGH)
  }
  for (var i = 0; i < move; i++) {
    components.push(MOVE)
  }
  for (var i = 0; i < heal; i++) {
    components.push(HEAL)
  }

  // console.log(JSON.stringify(components));
  return components
}

var createClaimCreep = function (spawn) {
  let capacity = spawn.room.energyCapacityAvailable
  if (capacity > 4000) {
    capacity = 4000
  }
  // capacity = spawn.room.energyAvailable;
  // console.log('Room capacity' + capacity);
  let components = []
  let remainingcapacity = capacity

  while (remainingcapacity >= 700) {
    components.push(CLAIM)
    components.push(MOVE)
    components.push(MOVE)
    remainingcapacity = remainingcapacity - 700
  }

  // console.log(JSON.stringify(components));
  // components.
  return components
}

var positionFree = function (roomposition) {
  console.log('roomposition:' + roomposition)
  let terrain = roomposition.lookFor(LOOK_TERRAIN)
  if (terrain.length > 0 && terrain[0] === 'wall') {
    console.log('terrain is wall: ' + JSON.stringify(terrain))
    return false
  }
  let structure = roomposition.lookFor(LOOK_STRUCTURES)
  if (structure.length > 0 && structure[0].structureType !== STRUCTURE_ROAD) {
    console.log('structure on it: ' + JSON.stringify(structure))
    return false
  }
  let constsite = roomposition.lookFor(LOOK_CONSTRUCTION_SITES)
  if (constsite.length > 0) {
    console.log('constsite on it: ' + JSON.stringify(constsite))
    return false
  }

  return true
}

var getHarvestID = function (room) {
  let creeplist = room.find(FIND_MY_CREEPS)
  let count1 = creeplist.filter(function (creep) { return creep.memory.source === 1 && (creep.ticksToLive > 100 || creep.spawning) && (creep.memory.role === 'builder' || creep.memory.role === 'upgrader' || creep.memory.role === 'harvester') }).length
  let count0 = creeplist.filter(function (creep) { return creep.memory.source === 0 && (creep.ticksToLive > 100 || creep.spawning) && (creep.memory.role === 'builder' || creep.memory.role === 'upgrader' || creep.memory.role === 'harvester') }).length
  // console.log('count 0: ' + count0 + ' count1: ' + count1);
  let res = (count1 >= count0) ? 0 : 1
  // console.log('Target source for new creep:' + res);

  return res
}
