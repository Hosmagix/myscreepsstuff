export class BaseRole<T extends Creep> {
  public constructor(protected creep: T) {}
  public log(message: string) {
    console.log(`${this.creep.name}/${this.creep.memory.role}:${this.creep.room.name} : ${message}`);
  }

  public initMaxCarry() {
    if (this.creep.memory.maxcarry) {
      return;
    }
    const carry = this.creep.getActiveBodyparts(CARRY);
    if (carry > 0) {
      const maxweight = this.creep.getActiveBodyparts(MOVE);
      const remainingweight = maxweight - this.creep.getActiveBodyparts(WORK);
      const maxcarry = remainingweight * 50;
      // console.log(this.name + '/' + this.memory.role + 'has a maxcarry of' + maxcarry);
      this.creep.memory.maxcarry = maxcarry;
    } else {
      // console.log('creep has no carry -> should be fine');
      this.creep.memory.maxcarry = 1;
    }
  }

  public boost(mineraltype: MineralConstant) {
    const lab = this.creep.pos.findClosestByRange<StructureLab>(FIND_MY_STRUCTURES, {
      filter(structure) {
        return (
          structure.structureType === "lab" && structure.mineralType === mineraltype && structure.mineralAmount > 100
        );
      }
    });
    if (lab) {
      this.creep.moveTo(lab);
      lab.boostCreep(this.creep);
      return true;
    }
    return false;
  }

  public goTo(roompos: RoomPosition) {
    // console.log('goto called');
    let plaincost = 1;
    let swampcost = 5;

    if (!roompos) {
      return false;
    }
    if (this.creep.pos.isNearTo(roompos)) {
      // check if its empty TODO

      const terrain = roompos.lookFor(LOOK_TERRAIN);
      if (terrain.length > 0 && terrain[0] === "wall") {
        // this.log('terrain is wall: ' + JSON.stringify(terrain));
        return false;
      }
      const structure = roompos.lookFor(LOOK_STRUCTURES).filter(function (stru) {
        return stru.structureType !== STRUCTURE_ROAD && stru.structureType !== STRUCTURE_RAMPART;
      });
      if (structure.length > 0) {
        // this.log('structure on it: ' + JSON.stringify(structure));
        return false;
      }

      const direction = this.creep.pos.getDirectionTo(roompos);
      this.creep.move(direction);
      this.log(`moving to roompos with direction ${direction}`);
      return true;
    }

    if (this.creep.fatigue) {
      return ERR_TIRED;
    }
    if (!this.creep.memory.maxcarry) {
      this.initMaxCarry();
    }
    if (this.creep.memory.maxcarry && this.creep.memory.maxcarry !== 1) {
      if (this.creep.store.getUsedCapacity() > this.creep.memory.maxcarry) {
        plaincost = 2;
        swampcost = 10;
      }
    }

    // console.log('plaincost: ' + plaincost + 'swampcost: ' + swampcost);

    const lasttarget = this.creep.memory.lasttarget;

    if (
      lasttarget &&
      this.creep.memory.path &&
      this.creep.memory.path.length > 0 &&
      lasttarget.x === roompos.x &&
      lasttarget.y === roompos.y &&
      lasttarget.roomName === roompos.roomName
    ) {
      // console.log('old path found');
      let temppos = this.creep.memory.path.shift();
      if (!temppos) {
        console.log("wrong tempos" + JSON.stringify(temppos));
        return this.creep.moveTo(roompos);
      }

      if (temppos.x === this.creep.pos.x && temppos.y === this.creep.pos.y && this.creep.memory.path.length > 0) {
        temppos = this.creep.memory.path.shift()!; // at border it might be possible that the creep gets ported a step further ...
      }

      const next = new RoomPosition(temppos.x, temppos.y, temppos.roomName);

      if (next && this.creep.pos.isNearTo(next)) {
        const direction = this.creep.pos.getDirectionTo(next);
        const result = this.creep.move(direction);

        // var result = this.moveTo(next);
        if (result === OK) {
          return OK;
        }
      }
    }

    let range = 1;
    if (this.creep.pos.roomName !== roompos.roomName) {
      // this.log('walking to other room -> use dist 2');
      range = 2;
    }

    const res = PathFinder.search(
      this.creep.pos,
      { pos: roompos, range },
      {
        plainCost: plaincost,
        swampCost: swampcost,
        maxCost: 400,
        maxOps: 4000,
        // serialize: true,
        roomCallback: roomName => {
          const room = Game.rooms[roomName];

          if (!room) return new PathFinder.CostMatrix();

          const costs = room.getCostmatrix();

          if (roomName === this.creep.pos.roomName) {
            // console.log('bla');
            this.creep.pos.findInRange(FIND_CREEPS, 4).forEach(oc => {
              costs.set(oc.pos.x, oc.pos.y, 0xff);
            });
          }

          return costs;
        }
      }
    );

    this.creep.memory.path = res.path;

    this.creep.memory.lasttarget = roompos;
    if (res.path.length === 0) {
      this.log(
        `no path found: targetposition was: ${JSON.stringify(roompos)} creeppos was: ${JSON.stringify(this.creep.pos)}`
      );
      return ERR_NO_PATH;
    }
    if (this.creep.memory.role === "looter") {
      this.log(JSON.stringify(res));
    }
    if (res.incomplete) {
      // this.log('res was incomplete: ' + JSON.stringify(res))
    }

    // console.log('res.path: '+ JSON.stringify(res));
    const nextsquare = this.creep.memory.path.shift()!;
    const direction = this.creep.pos.getDirectionTo(nextsquare);
    this.creep.move(direction);
    const result = this.creep.moveTo(nextsquare);
    // console.log(this.name + ' creepprototype: move to room with result:' + result);

    if (result !== OK) {
      this.log(
        `targetposition was: ${JSON.stringify(nextsquare)} creeppos was: ${JSON.stringify(
          this.creep.pos
        )} result: ${result}`
      );
      // this.log('path:' + JSON.stringify(res.path));
    }

    return result;
  }

  protected checkForEnemies(): boolean {
    if (this.creep.memory.home && this.creep.room.name !== this.creep.memory.home) {
      const targets = this.creep.room.find(FIND_HOSTILE_CREEPS).filter(function (hc) {
        return (
          hc.getActiveBodyparts(ATTACK) > 0 ||
          hc.getActiveBodyparts(RANGED_ATTACK) > 0 ||
          hc.getActiveBodyparts(HEAL) > 0
        );
      });
      // var targets = this.room.find(FIND_HOSTILE_CREEPS);
      if (targets.length > 0) {
        console.log("creep: " + this.creep.name + " is in Danger -> returning home");
        // Game.rooms[this.memory.room].memory.danger = true;
        Game.rooms[this.creep.room.name].memory.dangertill = Game.time + 50;
        this.creep.memory.dangertill = Game.time + 50;
        // going home

        const homeroom = Game.rooms[this.creep.memory.home];
        // console.log('homeroom' +JSON.stringify(homeroom));

        const exitDir = this.creep.room.findExitTo(homeroom);
        const exit = this.creep.pos.findClosestByRange(exitDir)!;
        this.creep.moveTo(exit);
        return true;
      } else {
        Game.rooms[this.creep.room.name].memory.dangertill = Game.time - 1;
        // Game.rooms[this.room.name].memory.danger = false;
        // console.log('this.memory.room' + this.memory.room);
        return false;
      }
    }
    return false;
  }

  protected checkForKeepers(): boolean {
    if (this.creep.memory.home && this.creep.room.name !== this.creep.memory.home) {
      const keepers = this.creep.room
        .find(FIND_HOSTILE_CREEPS)
        .filter(
          hc =>
            (hc.getActiveBodyparts(ATTACK) > 0 ||
              hc.getActiveBodyparts(RANGED_ATTACK) > 0 ||
              hc.getActiveBodyparts(HEAL) > 0) &&
            hc.owner.username !== "Source Keeper"
        );

      // var targets = this.creep.room.find(FIND_HOSTILE_CREEPS);
      //
      if (keepers.length >= 1) {
        Game.rooms[this.creep.room.name].memory.dangertill = Game.time + 50;
        this.creep.memory.dangertill = Game.time + 50;
        const homeroom = Game.rooms[this.creep.memory.home];
        this.goTo(homeroom.controller!.pos);
        // console.log('targets:' + JSON.stringify(targets));
        return true;
      } else {
        Game.rooms[this.creep.room.name].memory.dangertill = Game.time - 1;
      }
    }

    let targets = this.creep.pos.findInRange(FIND_HOSTILE_CREEPS, 6);

    let lairs = this.creep.pos.findInRange(FIND_HOSTILE_STRUCTURES, 6).filter(function (structure) {
      return structure.structureType === STRUCTURE_KEEPER_LAIR && structure.ticksToSpawn! <= 15;
    });

    if (this.creep.hits < this.creep.hitsMax - 300) {
      const homeroom = Game.rooms[this.creep.memory.home];
      // this.creep.log('creep is damaged by more than 300 hp return');
      if (homeroom.storage) {
        this.goTo(homeroom.storage.pos);
      } else {
        this.goTo(homeroom.controller!.pos);
      }
      return true;
    }

    // console.log('this.creep.hits ' + this.creep.hits+'/'+this.creep.hitsMax);
    if (targets.length > 0 || lairs.length > 0) {
      // console.log('this.creep in 6: ' + targets.length + 'pos: ' + JSON.stringify(this.creep.pos ));
      targets = targets.filter(target => {
        return this.creep.pos.inRangeTo(target, 5);
      });
      lairs = lairs.filter(target => {
        return this.creep.pos.inRangeTo(target, 5);
      });
      // console.log('creeps in 5: ' + targets.length);

      if (targets.length > 0 || lairs.length > 0) {
        const homeroom = Game.rooms[this.creep.memory.home];

        if (homeroom.storage) {
          this.creep.moveTo(homeroom.storage);
        } else {
          this.creep.moveTo(homeroom.controller!);
        }
      }

      return true;
    }

    return false;
  }

  protected buildRoads(): void {
    const structures = this.creep.pos.lookFor(LOOK_STRUCTURES).filter(function (structure) {
      return structure.structureType === STRUCTURE_ROAD;
    });
    if (
      structures.length === 0 &&
      this.creep.pos.lookFor(LOOK_CONSTRUCTION_SITES).length === 0 &&
      this.creep.fatigue > 0
    ) {
      const flags = this.creep.pos.lookFor(LOOK_FLAGS);
      if (flags.length > 0) {
        const flag = flags[0];
        const terrain = Game.map.getTerrainAt(flag.pos);
        const visited = flag.memory.visited ? flag.memory.visited : 0;
        const effectivevisited = terrain === "swamp" ? visited / 4 : visited;

        if (flag.memory.visited && effectivevisited >= 2) {
          if (this.creep.pos.createConstructionSite(STRUCTURE_ROAD) === OK) {
            flag.remove();
            console.log("flag was visited enough -> creating Road");
          }
        } else {
          // console.log('updating flag visited');
          const extra = this.creep.memory.role === "harvester" ? 2 : 1;

          flag.memory.visited = flag.memory.visited ? flag.memory.visited + extra : extra;
        }
      } else {
        this.creep.pos.createFlag();
        // console.log('creating Flag at' +this.creep.pos);
      }
    } else if (structures.length >= 1) {
      const road = structures[0];
      if (road.hits < road.hitsMax / 2) {
        if (this.creep.getActiveBodyparts(WORK) > 0 && this.creep.carry.energy > 0) {
          this.creep.repair(road);
        }
      }
    }
  }
}
