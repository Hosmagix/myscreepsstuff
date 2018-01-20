let findReaction = require('findReaction');

exports.overridePrototypes = function () {
  Creep.prototype.log = function (message) {
    console.log(this.name + '/' + this.memory.role + ':' + this.room.name + ' : ' + message);
  };

  Creep.prototype.initmaxcarry = function () {
    if (this.memory.maxcarry) {
      // console.log('maxcarry was already inizialized return');
      return;
    }
    let carry = this.getActiveBodyparts(CARRY);
    if (carry > 0) {
      let maxweight = this.getActiveBodyparts(MOVE);
      let remainingweight = maxweight - this.getActiveBodyparts(WORK);
      let maxcarry = remainingweight * 50;
      // console.log(this.name + '/' + this.memory.role + 'has a maxcarry of' + maxcarry);
      this.memory.maxcarry = maxcarry;
    } else {
      // console.log('creep has no carry -> should be fine');
      this.memory.maxcarry = 1;
    }
  };

  Room.prototype.log = function (message) {
    console.log(this.name + ' : ' + message);
  };

  Room.prototype.getCostmatrix = function (plaincost) {
    if (this.matrix1) {
      // console.log('found old matrix -> return it');
      return this.matrix1;
    } else if (this.memory.storedmatrix && this.memory.storedmatrix.timevalid > Game.time) {
      this.matrix1 = PathFinder.CostMatrix.deserialize(this.memory.storedmatrix.matrix);
      // this.log('found stored costmatrix');
      return this.matrix1.clone();
    } else {
      // console.log('creating new costmatrix ');
      let costs = new PathFinder.CostMatrix();

      this.find(FIND_STRUCTURES).forEach(function (structure) {
        if (structure.structureType === STRUCTURE_ROAD) {
          // Favor roads over plain tiles
          costs.set(structure.pos.x, structure.pos.y, 1);
        } else if (structure.structureType !== STRUCTURE_CONTAINER &&
          (structure.structureType !== STRUCTURE_RAMPART ||
            !structure.my)) {
          // Can't walk through non-walkable buildings
          costs.set(structure.pos.x, structure.pos.y, 0xff);
        }
      });

      this.find(FIND_CONSTRUCTION_SITES).forEach(function (construcitonsite) {
        if (construcitonsite.structureType !== STRUCTURE_ROAD && construcitonsite.structureType !== STRUCTURE_CONTAINER && construcitonsite.structureType !== STRUCTURE_RAMPART) {
          costs.set(construcitonsite.pos.x, construcitonsite.pos.y, 0xff);
        }
      });

      this.matrix1 = costs;
      let storedmatrix = {};
      storedmatrix.timevalid = Game.time + 10;
      storedmatrix.matrix = costs.serialize();
      this.memory.storedmatrix = storedmatrix;

      return costs.clone();
    }
  };

  Room.prototype.findHostileCreeps = function () {
    if (this._hostileCreeps === undefined) {
      this._hostileCreeps = this.find(FIND_HOSTILE_CREEPS);
    }

    return this._hostileCreeps;
  };

  Room.prototype.findFriendlyDamagedCreeps = function () {
    if (this._friendlyDamagedCreeps === undefined) {
      this._friendlyDamagedCreeps = this.find(FIND_MY_CREEPS, {
        filter: function (mc) { return mc.hits < mc.hitsMax; }
      });
    }
    return this._friendlyDamagedCreeps;
  };

  Creep.prototype.boost = function (mineraltype) {
    let lab = this.pos.findClosestByRange(FIND_MY_STRUCTURES, {
      filter: function (lab) {
        return lab.mineralType === mineraltype && lab.mineralAmount > 100;
      }
    });
    if (lab) {
      this.moveTo(lab);
      lab.boostCreep(this);
      return true;
    }
    return false;
  };

  Creep.prototype.goTo = function (roompos) {
    // console.log('goto called');
    let plaincost = 1;
    let swampcost = 5;

    if (!roompos) {
      return false;
    }
    if (this.pos.isNearTo(roompos)) {
      // check if its empty TODO

      let terrain = roompos.lookFor(LOOK_TERRAIN);
      if (terrain.length > 0 && terrain[0] === 'wall') {
        // this.log('terrain is wall: ' + JSON.stringify(terrain));
        return false;
      }
      let structure = roompos.lookFor(LOOK_STRUCTURES).filter(function (stru) {
        return stru.structureType !== STRUCTURE_ROAD && stru.structureType !== STRUCTURE_RAMPART;
      });
      if (structure.length > 0) {
        // this.log('structure on it: ' + JSON.stringify(structure));
        return false;
      }

      var direction = this.pos.getDirectionTo(roompos);
      this.move(direction);
      this.log('moving to roompos with direction ' + direction);
      return true;
    }

    if (this.fatigue) {
      return ERR_TIRED;
    }
    if (!this.memory.maxcarry) {
      this.initmaxcarry();
    }
    if (this.memory.maxcarry && this.memory.maxcarry !== 1) {
      let weight = _.sum(this.carry);
      if (weight > this.memory.maxcarry) {
        // console.log(this.name + '/' + this.memory.role +' weight is larger than carry -> use 2 and 10');
        plaincost = 2;
        swampcost = 10;
      }
    }

    // console.log('plaincost: ' + plaincost + 'swampcost: ' + swampcost);

    let lasttarget = this.memory.lasttarget;

    if (lasttarget && this.memory.path && this.memory.path.length > 0 && lasttarget.x === roompos.x && lasttarget.y === roompos.y && lasttarget.roomName === roompos.roomName) {
      // console.log('old path found');
      let temppos = this.memory.path.shift();
      if (!temppos) {
        console.log('wrong tempos' + JSON.stringify(temppos));
        return this.moveTo(roompos);
      }
      let next = new RoomPosition(temppos.x, temppos.y, temppos.roomName);

      if (next && this.pos.isNearTo(next)) {
        var direction = this.pos.getDirectionTo(next);
        var result = this.move(direction);

        // var result = this.moveTo(next);
        if (result === OK) {
          return OK;
        }
      }
    }

    let creep = this;
    let range = 1;
    if (this.pos.roomName !== roompos.roomName) {
      // this.log('walking to other room -> use dist 2');
      range = 2;
    }

    let res = PathFinder.search(this.pos, { pos: roompos, range: range }, {
      plainCost: plaincost,
      swampCost: swampcost,
      maxCost: 400,
      maxOps: 4000,
      // serialize: true,
      roomCallback: function (roomName) {
        let room = Game.rooms[roomName];

        if (!room) return new PathFinder.CostMatrix();

        let costs = room.getCostmatrix();

        if (roomName === creep.pos.roomName) {
          // console.log('bla');
          creep.pos.findInRange(FIND_CREEPS, 4).forEach(function (oc) {
            costs.set(oc.pos.x, oc.pos.y, 0xff);
            // console.log('bladoof');
          });
        }

        return costs;
      }
    });

    // var serializedpath = this.room.serializePath(res.path);
    // this.log('serialized path: ' + serializedpath);
    // this.log('serialized path: ' + res.path);

    this.memory.path = res.path;

    this.memory.lasttarget = roompos;
    if (res.path.length === 0) {
      this.log('no path found: targetposition was: ' + JSON.stringify(roompos) + ' creeppos was: ' + JSON.stringify(this.pos));
      return ERR_NO_PATH;
    }
    if (this.memory.role === 'looter') {
      this.log(JSON.stringify(res));
    }
    if (res.incomplete) {
      // this.log('res was incomplete: ' + JSON.stringify(res))
    }

    // console.log('res.path: '+ JSON.stringify(res));
    let nextsquare = this.memory.path.shift();
    var direction = this.pos.getDirectionTo(nextsquare);
    this.move(direction);
    var result = this.moveTo(nextsquare);
    // console.log(this.name + ' creepprototype: move to room with result:' + result);

    if (result !== OK) {
      this.log('targetposition was: ' + JSON.stringify(nextsquare) + ' creeppos was: ' + JSON.stringify(this.pos) + 'result: ' + result);
      // this.log('path:' + JSON.stringify(res.path));
    }

    return result;
  };

  Creep.prototype.checkForEnemies = function () {
    if (this.memory.home && this.room.name !== this.memory.home) {
      let targets = this.room.find(FIND_HOSTILE_CREEPS).filter(function (hc) {
        return (hc.getActiveBodyparts(ATTACK) > 0) || (hc.getActiveBodyparts(RANGED_ATTACK) > 0) || (hc.getActiveBodyparts(HEAL) > 0);
      });
      // var targets = this.room.find(FIND_HOSTILE_CREEPS);
      if (targets.length > 0) {
        console.log('creep: ' + this.name + ' is in Danger -> returning home');
        // Game.rooms[this.memory.room].memory.danger = true;
        Game.rooms[this.room.name].memory.dangertill = Game.time + 50;
        this.memory.dangertill = Game.time + 50;
        // going home

        let homeroom = Game.rooms[this.memory.home];
        // console.log('homeroom' +JSON.stringify(homeroom));

        let exitDir = this.room.findExitTo(homeroom);
        let exit = this.pos.findClosestByRange(exitDir);
        this.moveTo(exit);
        return true;
      } else {
        Game.rooms[this.room.name].memory.dangertill = Game.time - 1;
        // Game.rooms[this.room.name].memory.danger = false;
        // console.log('this.memory.room' + this.memory.room);
        return false;
      }
    }
  };

  Creep.prototype.checkForKeepers = function () {
    let that = this;
    if (this.memory.home && this.room.name !== this.memory.home) {
      var targets = this.room.find(FIND_HOSTILE_CREEPS).filter(function (hc) {
        return (hc.getActiveBodyparts(ATTACK) > 0 || hc.getActiveBodyparts(RANGED_ATTACK) > 0 || hc.getActiveBodyparts(HEAL) > 0) && hc.owner.username !== 'Source Keeper';
      });

      // var targets = this.room.find(FIND_HOSTILE_CREEPS);
      //
      if (targets.length >= 1) {
        Game.rooms[this.room.name].memory.dangertill = Game.time + 50;
        this.memory.dangertill = Game.time + 50;
        let homeroom = Game.rooms[this.memory.home];
        this.goTo(homeroom.controller.pos);
        // console.log('targets:' + JSON.stringify(targets));
        return true;
      } else {
        Game.rooms[this.room.name].memory.dangertill = Game.time - 1;
      }
    }

    var targets = this.pos.findInRange(FIND_HOSTILE_CREEPS, 6);

    let lairs = this.pos.findInRange(FIND_HOSTILE_STRUCTURES, 6).filter(function (structure) {
      return structure.structureType === STRUCTURE_KEEPER_LAIR && (structure.ticksToSpawn <= 15);
    });

    if (this.hits < this.hitsMax - 300) {
      let homeroom = Game.rooms[this.memory.home];
      this.log('creep is damaged by more than 300 hp return');
      if (homeroom.storage) {
        this.goTo(homeroom.storage.pos);
      } else {
        this.goTo(homeroom.controller.pos);
      }
      return true;
    }

    // console.log('this.hits ' + this.hits+'/'+this.hitsMax);
    if (targets.length > 0 || lairs.length > 0) {
      // console.log('this in 6: ' + targets.length + 'pos: ' + JSON.stringify(this.pos ));
      targets = targets.filter(function (target) {
        return that.pos.inRangeTo(target, 5);
      });
      lairs = lairs.filter(function (target) {
        return that.pos.inRangeTo(target, 5);
      });
      // console.log('creeps in 5: ' + targets.length);

      if (targets.length > 0 || lairs.length > 0) {
        let homeroom = Game.rooms[this.memory.home];

        if (homeroom.storage) {
          this.moveTo(homeroom.storage);
        } else {
          this.moveTo(homeroom.controller);
        }
      }

      return true;
    }

    return false;
  };

  Creep.prototype.buildRoads = function () {
    let structures = this.pos.lookFor(LOOK_STRUCTURES).filter(function (structure) {
      return structure.structureType === STRUCTURE_ROAD;
    });
    if (structures.length === 0 && this.pos.lookFor(LOOK_CONSTRUCTION_SITES).length === 0 && this.fatigue > 0) {
      let flags = this.pos.lookFor(LOOK_FLAGS);
      if (flags.length > 0) {
        let flag = flags[0];
        let terrain = Game.map.getTerrainAt(flag.pos);
        let visited = flag.memory.visited ? flag.memory.visited : 0;
        let effectivevisited = (terrain === 'swamp') ? visited / 4 : visited;

        if (flag.memory.visited && effectivevisited >= 2) {
          if (this.pos.createConstructionSite(STRUCTURE_ROAD) === OK) {
            flag.remove();
            console.log('flag was visited enough -> creating Road');
          }
        } else {
          // console.log('updating flag visited');
          let extra = (this.memory.role === 'harvester') ? 2 : 1;

          flag.memory.visited = flag.memory.visited ? flag.memory.visited + extra : extra;
        }
      } else {
        this.pos.createFlag();
        // console.log('creating Flag at' +this.pos);
      }
    } else if (structures.length >= 1) {
      let road = structures[0];
      if (road.hits < road.hitsMax / 2) {
        if (this.getActiveBodyparts(WORK) > 0 && this.carry.energy > 0) {
          this.repair(road);
        }
      }
    }
  };

  let reactions;

  Game.getReactions = function () {
    if (!reactions) {
      reactions = findReaction.updateReactionsByRoom();
    }
    return reactions;
  };
};
