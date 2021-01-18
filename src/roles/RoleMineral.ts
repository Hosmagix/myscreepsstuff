import { MineralCreep } from "../interfaces/MyCreep";
import { BaseRole } from "./BaseRole";

export class RoleMineral extends BaseRole<MineralCreep> {
  // assume: memory.mineral // mineraltype
  // memory.room -> targetroom
  // memory.home -> homeroom
  // memory.mineralpos -> mineralpos
  public constructor(creep: MineralCreep) {
    super(creep);
  }

  private labneeds(mineral: MineralConstant) {
    const room = this.creep.room;
    const res =
      (room.memory.reaction && (room.memory.reaction.m1 === mineral || room.memory.reaction.m2 === mineral)) ||
      room.memory.display;
    // this.creep.log('labneeds: ' + res + ' reaction: ' + JSON.stringify(room.memory.reaction));
    // room.log('labneeds: ' + 'reaction: ' + JSON.stringify(room.memory.reaction) + room.memory.display);
    return res;
  }

  public terminalneeds(mineral: MineralConstant) {
    const room = this.creep.room;

    const res = room.terminal && (!room.terminal.store[mineral] || room.terminal.store[mineral] < 10000);
    // this.creep.log(mineral + ' ' + res);
    return res;
  }

  public harvest() {
    if (!this.creep.memory.dump) {
      const resources = this.creep.room.find(FIND_DROPPED_RESOURCES).filter(res => {
        return res.resourceType === this.creep.memory.mineral;
      });

      const target = this.creep.pos.findClosestByRange(resources);
      if (target) {
        const range = this.creep.pos.getRangeTo(target);
        if (range <= 1) {
          this.creep.pickup(target);
          // this.creep.moveTo(target);
          return;
        } else if (range <= 5) {
          this.creep.moveTo(target);
          return;
        }
      }
    }
    // other room
    if (this.creep.memory.room && this.creep.room.name !== this.creep.memory.room) {
      var roompos = new RoomPosition(25, 25, this.creep.memory.room);
      if (this.creep.memory.sourcepos) {
        roompos = new RoomPosition(
          this.creep.memory.sourcepos.x,
          this.creep.memory.sourcepos.y,
          this.creep.memory.room
        );
      }
      const result = this.creep.moveTo(roompos);
      if (result !== 0 && result !== -4) {
        // console.log(this.creep.name + ' could not find ists way because:'+result);
      }
      return;
    }

    if (this.creep.memory.containerpos && this.creep.memory.role === "mineralsltrans") {
      var roompos = new RoomPosition(
        this.creep.memory.containerpos.x,
        this.creep.memory.containerpos.y,
        this.creep.memory.room
      );
      // var source = roompos.lookFor(LOOK_SOURCES)[0];
      var container = roompos.findInRange(FIND_STRUCTURES, 3).filter(function (structure) {
        return structure.structureType === STRUCTURE_CONTAINER;
      });
      if (container && container.length > 0) {
        // console.log(this.creep.name + ' sltrans founc container');
        const con = container[0];

        if (this.creep.withdraw(con, this.creep.memory.mineral) !== OK) {
          this.creep.moveTo(con);
        }
        return;
      }
    }

    if (this.creep.memory.mineralpos) {
      // console.log(JSON.stringify(this.creep.memory));

      var roompos = new RoomPosition(
        this.creep.memory.mineralpos.x,
        this.creep.memory.mineralpos.y,
        this.creep.memory.room
      );
      // var source = roompos.lookFor(LOOK_SOURCES)[0];
      const source = roompos.findClosestByRange(FIND_MINERALS);

      const harvestresult = this.creep.harvest(source);
      if (harvestresult === ERR_NOT_IN_RANGE || harvestresult === ERR_INVALID_TARGET) {
        const status = this.creep.moveTo(source);
        if (status !== OK) {
          // console.log(this.creep.name + 'cannot move to target ' + source.pos +' because: ' + status);
          this.creep.moveTo(this.creep.room.controller!);
        }
      } else {
        if (source.ticksToRegeneration && harvestresult === ERR_NOT_ENOUGH_RESOURCES) {
          // console.log('source is depleted: regen in:' + source.ticksToRegeneration);
          this.creep.room.memory.mineralregentime = Game.time + source!.ticksToRegeneration;
          return;
        }
      }
      if (this.creep.memory.role === "mineraloutsider" && !this.creep.memory.drop) {
        // console.log('checking for finished container');
        var container = roompos.findInRange(FIND_STRUCTURES, 2).filter(function (structure) {
          // console.log('structure: ' + JSON.stringify(structure));
          return structure.structureType === STRUCTURE_CONTAINER;
        });
        if (container && container.length > 0) {
          // console.log('finished container found');
          // console.log( Game.rooms[this.creep.memory.home].memory.slaverooms.length);
          Game.rooms[this.creep.memory.home].memory.slaverooms?.forEach(function (slaveroom) {
            if (
              slaveroom &&
              slaveroom.x === roompos.x &&
              slaveroom.y === roompos.y &&
              slaveroom.roomName === roompos.roomName
            ) {
              // console.log('setting flag for container');
              slaveroom.container = true;
            }
          });
        }
      }

      return;
    }

    // TODO fix performance
    const targets = this.creep.room.find(FIND_STRUCTURES, {
      filter: structure => {
        return (
          structure.structureType === STRUCTURE_LAB &&
          structure.mineralType &&
          this.creep.room.memory.reaction &&
          structure.mineralType !== this.creep.room.memory.reaction.m1 &&
          structure.mineralType !== this.creep.room.memory.reaction.m2 &&
          (structure.mineralAmount > 2000 || structure.mineralType !== this.creep.room.memory.reaction.res)
        );
      }
    });
    if (targets.length > 0) {
      const labToWithdraw = targets[0] as StructureLab;
      // this.creep.log('target found: ' + target.mineralType + ' reaction: ' + JSON.stringify(this.creep.room.memory.reaction));
      if (this.creep.withdraw(labToWithdraw, labToWithdraw.mineralType) !== OK) {
        this.creep.moveTo(labToWithdraw);
      }
      return;
    }

    // storage

    const terminal = this.creep.room.terminal;

    const storage = this.creep.room.storage;
    if (storage) {
      // this.creep.log('rolemineraL:storage');
      var mineral = null;
      Object.keys(storage.store).forEach(function (key) {
        const amount = storage.store[key];

        let structurefull = false;
        const targets = this.creep.room.find(FIND_STRUCTURES, {
          filter: structure => {
            return structure.structureType === STRUCTURE_LAB && structure.mineralType && structure.mineralType === key;
          }
        });
        if (targets.length > 0) {
          const target = this.creep.pos.findClosestByRange(targets);
          // console.log('lab with mineral found + target.minerlAmount' + target.mineralAmount + 'target.mineralcapacity ' + target.mineralCapacity);
          if (target.mineralAmount > target.mineralCapacity - 1000) {
            structurefull = true;
          }
        }

        if (amount > 0 && key !== "energy" && (this.terminalneeds(key) || (!structurefull && this.labneeds(key)))) {
          mineral = key;
        }
      });
      if (mineral) {
        if (this.creep.withdraw(storage, mineral) !== OK) {
          this.creep.moveTo(storage);
        }
        return;
      }
    }

    if (terminal) {
      Object.keys(terminal.store).forEach(function (key) {
        const amount = terminal.store[key];
        let structurefull = false;
        const targets = this.creep.room.find(FIND_STRUCTURES, {
          filter: structure => {
            return structure.structureType === STRUCTURE_LAB && structure.mineralType && structure.mineralType === key;
          }
        });
        if (targets.length > 0) {
          const target = this.creep.pos.findClosestByRange(targets);
          // console.log('lab with mineral found + target.minerlAmount' + target.mineralAmount + 'target.mineralcapacity ' + target.mineralCapacity);
          if (target.mineralAmount > target.mineralCapacity - 1000) {
            structurefull = true;
          }
        }

        // console.log('amount ' + amount + ' key ' + key + ' structurefull ' + structurefull);

        if (amount > 0 && key !== "energy" && !structurefull && this.labneeds(key)) {
          mineral = key;
        }
      });
      if (this.creep.withdraw(terminal, mineral) !== OK) {
        this.creep.moveTo(terminal);
      }
    }

    // console.log(this.creep.memory.role + ' ' + this.creep.name + ' tries to harvest but finds nothing');
  }

  init() {
    if (this.creep.memory.role !== "mineraltransporter") {
      // TODO: fixme -> other room compatible
      const mineral = this.creep.room.find(FIND_MINERALS);
      const mineraltype = mineral[0].mineralType;
      this.creep.memory.mineral = mineraltype;
      this.creep.memory.mineralpos = mineral[0].pos;
    }

    this.creep.memory.init = true;

    if (!this.creep.memory.room) {
      this.creep.memory.room = this.creep.room.name;
    }
  }

  public run() {
    if (!this.creep.memory.init) {
      this.init(this.creep);
    }

    if (
      this.creep.memory.dangertill &&
      this.creep.memory.dangertill > Game.time &&
      this.creep.memory.home &&
      this.creep.room.name === this.creep.memory.home
    ) {
      //  console.log(this.creep.name +' target room might still be in danger -> not returning -> gathering at controller');
      this.creep.moveTo(this.creep.room.controller);
      return;
    }

    if (this.creep.checkForEnemies()) {
      return;
    }

    this.buildRoads();

    const totalcarrying = _.sum(this.creep.carry);

    if (this.creep.memory.building && totalcarrying === 0) {
      // !(this.creep.carry[this.creep.memory.mineral])
      this.creep.memory.building = false;
      this.creep.say("gathering");
    }
    // console.log(JSON.stringify(this.creep.carry) + '' +this.creep.memory.mineral +  ' building' +this.creep.memory.building);
    if (!this.creep.memory.building && totalcarrying === this.creep.carryCapacity) {
      this.creep.memory.building = true;
      this.creep.say("spending");
    }

    // console.log('carry: ' + JSON.stringify(this.creep.carry));
    // console.log('carrykeys: ' + JSON.stringify(Object.keys(this.creep.carry)));

    if (this.creep.memory.building) {
      let mineral = null;
      Object.keys(this.creep.carry).forEach(function (key) {
        const amount = this.creep.carry[key];
        if (amount > 0 && key !== "energy") {
          mineral = key;
        }
      });

      this.spendEnergy(mineral);
    } else {
      this.harvest(this.creep);
    }
  }

  private spendEnergy(mineral: MineralConstant) {
    if (
      this.creep.memory.role === "mineraloutsider" &&
      this.creep.memory.dump &&
      this.creep.memory.mineralpos &&
      this.creep.memory.room === this.creep.room.name
    ) {
      // role: sltrans
      // console.log('outsider ready to dump');
      const roompos = new RoomPosition(
        this.creep.memory.mineralpos.x,
        this.creep.memory.mineralpos.y,
        this.creep.memory.room
      );
      const container = roompos.findInRange(FIND_STRUCTURES, 2).filter(function (structure) {
        return structure.structureType === STRUCTURE_CONTAINER;
      });
      if (container && container.length > 0) {
        const con = container[0];
        const range = this.creep.pos.getRangeTo(con.pos);

        if (range <= 1) {
          const result = this.creep.transfer(con, this.creep.memory.mineral);
          if (result !== OK) {
            this.creep.drop(this.creep.memory.mineral, this.creep.carry[this.creep.memory.mineral]);
          }
          return;
        } else {
          this.creep.moveTo(con);
          return;
        }
      }
    }

    if (this.creep.memory.role === "mineraltransporter" && this.labneeds(mineral)) {
      //  this.creep.log('labneeds mineral:' + mineral);
      // bring energy to lab
      // filled labs
      var targets = this.creep.room.find(FIND_STRUCTURES, {
        filter: structure => {
          return (
            structure.structureType === STRUCTURE_LAB && structure.mineralType && structure.mineralType === mineral
          );
        }
      });
      if (targets.length > 0) {
        // console.log('lab with mineral found');
        var target = this.creep.pos.findClosestByRange(targets);
        if (target.mineralAmount < target.mineralCapacity) {
          // console.log('lab not full yet -> fill');
          if (this.creep.transfer(target, mineral) === ERR_NOT_IN_RANGE) {
            this.creep.moveTo(target);
          }
          return;
        }
      } else {
        // empty labs
        // console.log('no lab found -> looking for empty ones');
        var targets = this.creep.room.find(FIND_STRUCTURES, {
          filter: structure => {
            return structure.structureType === STRUCTURE_LAB && structure.mineralAmount === 0;
          }
        });
        if (targets.length > 0) {
          var target = this.creep.pos.findClosestByRange(targets);
          if (this.creep.transfer(target, mineral) === ERR_NOT_IN_RANGE) {
            this.creep.moveTo(target);
          }
          return;
        }
      }
    }

    if (this.creep.room.terminal && mineral && this.terminalneeds(mineral)) {
      const terminal = this.creep.room.terminal;
      if (this.creep.transfer(terminal, mineral) === ERR_NOT_IN_RANGE) {
        this.creep.moveTo(terminal);
      }
      return;
    }

    // bring energy to Storage
    if (this.creep.room.storage) {
      const storage = this.creep.room.storage;
      if (this.creep.transfer(storage, mineral) === ERR_NOT_IN_RANGE) {
        this.creep.moveTo(storage);
      }
      return;
    }

    // outside
    if (this.creep.memory.home && this.creep.memory.home !== this.creep.room.name) {
      // console.log(this.creep.name + ' not in homeroom');

      const homeroom = Game.rooms[this.creep.memory.home];

      const exitDir = this.creep.room.findExitTo(homeroom);
      if (homeroom.storage) {
        this.creep.moveTo(homeroom.storage);
      } else {
        this.creep.moveTo(homeroom.controller!);
      }
      return;
    }

    console.log(this.creep.name + "tries to spend energy but cannnot");
  }
}
