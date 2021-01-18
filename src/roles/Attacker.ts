import { CombatCreep } from "../interfaces/MyCreep";

export class Attacker {
  public constructor(private creep: CombatCreep) {}
  public act() {
    // console.log('roleAttacker act called');
    if (this.creep.memory.ranged) {
      const result = this.ranged_act();
      this.afteract();
      return result;
    }

    const priorityTargets = [];

    for (const flagN in Game.flags) {
      const flag = Game.flags[flagN];
      if (flag.color === COLOR_PURPLE && this.creep.room.name === flag.pos.roomName) {
        const targets = flag.pos.lookFor(LOOK_STRUCTURES).filter(pos => pos.structureType !== STRUCTURE_ROAD);
        if (targets.length > 0) {
          priorityTargets.push(targets[0]);
        }
      }
    }

    const nearestTarget = this.creep.pos.findClosestByRange(priorityTargets);
    if (nearestTarget !== null) {
      if (this.creep.attack(nearestTarget) !== OK) {
        if (this.creep.moveTo(nearestTarget, { reusePath: 0 }) === OK) {
          this.creep.attack(nearestTarget);
        }
      }
      return true;
    }

    // adjacent creeps
    let openTargets = this.creep.room.find(FIND_HOSTILE_CREEPS).filter(function (hc) {
      const structures = hc.pos.lookFor(LOOK_STRUCTURES).filter(pos => pos.structureType !== STRUCTURE_ROAD);
      return structures.length === 0;
    });
    if (this.creep.memory.ignoreneutrals) {
      openTargets = openTargets.filter(hc => {
        return this.creep.pos.inRangeTo(hc, 1);
      });
    }

    if (openTargets.length > 0) {
      const target = this.creep.pos.findClosestByRange(openTargets)!;
      if (this.creep.attack(target) !== OK) {
        if (this.creep.moveTo(target, { reusePath: 0 }) === OK) {
          this.creep.attack(target);
        }
      }
      return true;
    }

    // offensive creeps
    let offensiveCreeps = this.creep.room.find(FIND_HOSTILE_CREEPS).filter(hc => {
      const structures = hc.pos.lookFor(LOOK_STRUCTURES).filter(s => {
        return s.structureType !== STRUCTURE_ROAD;
      });
      return structures.length === 0;
    });
    if (this.creep.memory.ignoreneutrals) {
      offensiveCreeps = offensiveCreeps.filter(hc => {
        return (
          (hc.owner.username !== "Source Keeper" || this.creep.pos.inRangeTo(hc, 4)) &&
          (hc.getActiveBodyparts(ATTACK) > 0 ||
            hc.getActiveBodyparts(RANGED_ATTACK)  > 0 ||
            hc.getActiveBodyparts(HEAL) > 0)
        );
      });
    }

    const towers = this.creep.room.find(FIND_HOSTILE_STRUCTURES, {
      filter: structure => {
        return structure.structureType === STRUCTURE_TOWER;
      }
    });

    const creepsandtowers: (Creep | StructureTower)[] = offensiveCreeps.concat(towers as any);

    if (creepsandtowers.length > 0) {
      const target = this.creep.pos.findClosestByRange(creepsandtowers)!;
      if (this.creep.attack(target) !== OK) {
        if (this.creep.moveTo(target, { reusePath: 0 }) === OK) {
          this.creep.attack(target);
        }
      }
      return true;
    }

    // normal creeps
    let targets = this.creep.room.find(FIND_HOSTILE_CREEPS).filter(function (hc) {
      const structures = hc.pos.lookFor(LOOK_STRUCTURES).filter(s => s.structureType !== STRUCTURE_ROAD);
      return structures.length === 0;
    });
    if (this.creep.memory.ignoreneutrals) {
      targets = targets.filter(hc => {
        return hc.owner.username !== "Source Keeper" || this.creep.pos.inRangeTo(hc, 4);
      });
    }
    const structures = this.creep.room.find(FIND_HOSTILE_STRUCTURES, {
      filter: structure => {
        return (
          structure.structureType !== STRUCTURE_CONTROLLER &&
          structure.structureType !== STRUCTURE_RAMPART &&
          structure.structureType !== STRUCTURE_STORAGE &&
          structure.structureType !== STRUCTURE_TERMINAL &&
          structure.structureType !== STRUCTURE_KEEPER_LAIR
        );
      }
    });
    const both: (Creep | AnyOwnedStructure)[] = targets.concat(structures as any);
    // var both = structures;
    if (both.length > 0) {
      const target = this.creep.pos.findClosestByRange(both)!;
      if (this.creep.attack(target) !== OK) {
        if (this.creep.moveTo(target, { reusePath: 0 }) === OK) {
          this.creep.attack(target);
        }
      }
      return true;
    }
    /*

          var targets = this.creep.room.find(FIND_HOSTILE_STRUCTURES,{
              filter: (structure) => {
                  return (structure.structureType !== STRUCTURE_CONTROLLER && structure.structureType !== STRUCTURE_KEEPER_LAIR);

              }
          });

          if (targets.length > 0) {
              // console.log('hi');
              var target = this.creep.pos.findClosestByRange(targets);
              if(this.creep.attack(target )!== OK){
                  if (this.creep.moveTo(target,{reusePath: 0}) === OK){
                      this.creep.attack(target);
                  }

              }
              return true;
          } */

    /* var targets = this.creep.room.find(FIND_HOSTILE_CONSTRUCTION_SITES);

          if (targets.length > 0) {
              var target = this.creep.pos.findClosestByRange(targets);
              this.creep.moveTo(target,{reusePath: 0});

              return true;
          } */

    // damaged

    if (this.creep.hits < this.creep.hitsMax) {
      // console.log('this.creep is damaged');

      if (this.creep.memory.home && this.creep.memory.home !== this.creep.room.name) {
        // console.log('this.creep is outside -> go home');
        const homeroom = Game.rooms[this.creep.memory.home];
        const exitDir = this.creep.room.findExitTo(homeroom);
        const exit = this.creep.pos.findClosestByRange(exitDir);
        this.creep.moveTo(exit);
        return;
      } else {
        // console.log('this.creep is at home');
        this.creep.moveTo(this.creep.room.controller!);
      }
      return true;
    }

    return false;
  }

  ranged_act() {
    // console.log('rangedact called')
    // set safepoint
    if (!this.creep.memory.safepoint || this.creep.memory.safepoint.roomName !== this.creep.room.name) {
      // && this.creep.pos.x > 0 && this.creep.pos.y > 0 && this.creep.pos.x < 49 && this.creep.pos.y < 49
      // console.log('this.creep just enered other room -> set safepoint');
      if (this.creep.room.name === this.creep.memory.home) {
        // console.log('this.creep is in homeroom');
        // set roomcontroller as default safepoint
        this.creep.memory.safepoint = this.creep.room.controller!.pos;
      } else {
        // console.log('this.creep is in other room');
        this.creep.memory.safepoint = this.creep.pos;
      }
    }
    const creepsInRange = this.creep.pos.findInRange(FIND_HOSTILE_CREEPS, 2).filter(function (hc) {
      return hc.getActiveBodyparts(ATTACK) > 0;
    });
    if (creepsInRange.length > 0) {
      // defender??? // TODO refactor: temprarily use defender code anyway // TODO:  idea check for healsupport
      let dmg = 0;
      creepsInRange.forEach(hc => {
        const distance = this.creep.pos.getRangeTo(hc);
        if (distance === 1) {
          dmg += 10;
        } else if (distance === 2) {
          dmg += 4;
        } else if (distance === 3) {
          dmg += 1;
        } else {
          console.log(`Warning: distance is: ${distance} but should be smaller than 3`);
        }
      });
      const closestTarget = this.creep.pos.findClosestByRange(creepsInRange)!;

      if (
        (this.creep.pos.x === 49 || this.creep.pos.y === 49 || this.creep.pos.x === 0 || this.creep.pos.y === 0) &&
        this.creep.hits > this.creep.hitsMax * 0.7
      ) {
        console.log("this.creep is at border -> move out");
        const center = new RoomPosition(25, 25, this.creep.room.name);
        this.creep.moveTo(center);
        if (dmg >= 10) {
          console.log(`dmg ist: ${dmg}`);
          this.creep.rangedMassAttack();
        } else {
          this.creep.rangedAttack(closestTarget);
        }
        return true;
      } else {
        const roompos = new RoomPosition(
          this.creep.memory.safepoint.x,
          this.creep.memory.safepoint.y,
          this.creep.room.name
        );
        this.creep.moveTo(roompos, { reusePath: 0 });
        if (dmg >= 10) {
          console.log(`dmg ist: ${dmg}`);
          this.creep.rangedMassAttack();
        } else {
          this.creep.rangedAttack(closestTarget);
        }
      }
      return true;
    }
    const targetsWithin3 = this.creep.pos.findInRange(FIND_HOSTILE_CREEPS, 3);
    if (this.creep.memory.role === "attacker") {
      const newtargets = targetsWithin3.filter(function (hc) {
        const structures = hc.pos.lookFor(LOOK_STRUCTURES).filter(s => {
          return s.structureType !== STRUCTURE_ROAD;
        });
        return structures.length === 0;
      });

      if (newtargets.length > 0) {
        const target = this.creep.pos.findClosestByRange(newtargets)!;

        let dmg = 0;
        newtargets.forEach(hc => {
          const distance = this.creep.pos.getRangeTo(hc);
          if (distance === 1) {
            dmg += 10;
          } else if (distance === 2) {
            dmg += 4;
          } else if (distance === 3) {
            dmg += 1;
          } else {
            console.log(`Warning: distance is: ${distance} but should be smaller than 3`);
          }
        });
        if (dmg >= 10) {
          console.log(`dmg is: ${dmg}`);
          this.creep.rangedMassAttack();
        } else {
          this.creep.rangedAttack(target);
        }

        if (this.creep.hits < this.creep.hitsMax * 0.7) {
          this.creep.moveTo(target, { reusePath: 0 });
        }
        return true;
      }
    }

    if (targetsWithin3.length > 0) {
      let closestTarget = -1;
      const healers = targetsWithin3.filter(function (hc) {
        return hc.getActiveBodyparts(HEAL) > 0;
      });
      const target = this.creep.pos.findClosestByRange(targetsWithin3)!;
      // console.log('hostile creeps in range 3 -> do nothing')
      if (targetsWithin3.length > 1 && healers.length >= 1) {
        this.creep.rangedMassAttack();
      } else {
        let dmg = 0;
        targetsWithin3.forEach(hc => {
          const distance = this.creep.pos.getRangeTo(hc);
          closestTarget = Math.max(distance, closestTarget);
          if (distance === 1) {
            dmg += 10;
          } else if (distance === 2) {
            dmg += 4;
          } else if (distance === 3) {
            dmg += 1;
          } else {
            console.log(`Warning: distance is: ${distance} but should be smaller than 3`);
          }
        });
        if (dmg >= 10) {
          console.log(`dmg is: ${dmg}`);
          this.creep.rangedMassAttack();
        } else {
          this.creep.rangedAttack(target);
        }
      }
      if (this.creep.hits > this.creep.hitsMax * 0.8) {
        console.log("this.creep has stil enough health -> fight");
        this.creep.moveTo(target, { reusePath: 0 });
      } else {
        const roompos = new RoomPosition(
          this.creep.memory.safepoint.x,
          this.creep.memory.safepoint.y,
          this.creep.room.name
        );
        this.creep.moveTo(roompos, { reusePath: 0 });
      }
      return true;
    }

    // damaged

    if (this.creep.hits < this.creep.hitsMax * 0.75) {
      console.log(`${this.creep.name} is damaged: ${this.creep.hits}/${this.creep.hitsMax}`);

      if (this.creep.memory.home && this.creep.memory.home !== this.creep.room.name) {
        // console.log('this.creep is outside -> go home');
        const homeroom = Game.rooms[this.creep.memory.home];
        const exitDir = this.creep.room.findExitTo(homeroom);
        const exit = this.creep.pos.findClosestByRange(exitDir);
        this.creep.moveTo(exit);
      } else {
        // console.log('this.creep is at home');
        this.creep.moveTo(this.creep.room.controller!);
      }
      return true;
    }

    const priorityTargets = [];

    for (const flagN in Game.flags) {
      const flag = Game.flags[flagN];
      if (flag.color === COLOR_PURPLE && this.creep.room.name === flag.pos.roomName) {
        const targets = flag.pos.lookFor(LOOK_STRUCTURES).filter(s => {
          return s.structureType !== STRUCTURE_ROAD;
        });
        if (targets.length > 0) {
          priorityTargets.push(targets[0]);
        }
      }
    }

    // offensive creeps
    let offensiveCreeps = this.creep.room.find(FIND_HOSTILE_CREEPS);
    if (this.creep.memory.ignoreneutrals) {
      offensiveCreeps = offensiveCreeps.filter(hc => {
        return hc.owner.username !== "Source Keeper" || this.creep.pos.inRangeTo(hc, 4);
      });
    }

    // move to enemy
    if (offensiveCreeps.length > 0) {
      // this.creep.log('targets detected');

      var target = this.creep.pos.findClosestByRange(targetsWithin3);
      // this.creep.log('target.pos: ' + JSON.stringify(target.pos));
      const result = this.creep.goTo(target.pos);
      this.creep.log(result);

      this.creep.rangedAttack(target);
      if (result === OK) {
        return true;
      }
    }

    // destroy stuff

    const targets = this.creep.room.find(FIND_HOSTILE_STRUCTURES, {
      filter: structure => {
        return (
          structure.structureType !== STRUCTURE_CONTROLLER &&
          structure.structureType !== STRUCTURE_RAMPART &&
          structure.structureType !== STRUCTURE_STORAGE &&
          structure.structureType !== STRUCTURE_KEEPER_LAIR
        );
      }
    });

    if (targets.length > 0) {
      var target = this.creep.pos.findClosestByRange(targets);
      // this.creep.log('found hostile structures' + JSON.stringify(target));
      if (this.creep.rangedAttack(target) !== OK) {
        this.creep.moveTo(target, { reusePath: 0 });
      }
      return true;
    }

    // don't reenter a fight in another room if just slightly above hitpoint minimum

    if (this.creep.hits < this.creep.hitsMax) {
      console.log(this.creep.name + " is damaged: " + this.creep.hits + "/" + this.creep.hitsMax);

      if (this.creep.memory.home && this.creep.memory.home !== this.creep.room.name) {
        // console.log('this.creep is outside -> go home');
        const homeroom = Game.rooms[this.creep.memory.home];
        const exitDir = this.creep.room.findExitTo(homeroom);
        const exit = this.creep.pos.findClosestByRange(exitDir);
        this.creep.moveTo(exit);
      } else {
        // console.log('this.creep is at home');
        this.creep.moveTo(this.creep.room.controller);
      }
      return true;
    }

    /* var targets = this.creep.room.find(FIND_HOSTILE_CONSTRUCTION_SITES);

              if (targets.length > 0) {
                  var target = this.creep.pos.findClosestByRange(targets);
                  this.creep.moveTo(target,{reusePath: 0});

                  return true;
          } */

    return false;
  }

  public init() {
    this.creep.memory.init = true;
    const rangedparts = this.creep.getActiveBodyparts(RANGED_ATTACK);
    if (rangedparts > 0) {
      this.creep.memory.ranged = true;
    }
    if (this.creep.getActiveBodyparts(HEAL) > 0) {
      this.creep.memory.hasheal = true;
    }
    if (this.creep.memory.role === "Specialdefender") {
      console.log("init specialdefender");
    }
  }

  private afteract() {
    if (this.creep.memory.hasheal && this.creep.hits < this.creep.hitsMax) {
      this.creep.heal(this.creep);
    }
  }

  public run() {
    if (!this.creep.memory.init) {
      this.init();
    }
    // if (!(this.creep.memory.gatheringpoint !== this.creep.room.roomName && this.creep.memory.role === 'attacker')){
    const actiondone = this.act();
    if (actiondone) {
      // console.log('bla' + this.creep.name);
      return;
    }

    this.afteract();
    // }

    if (Game.time % 5 === 0 && this.creep.memory.role === "Specialdefender") {
      // console.log('check for rooms to defend');
      const roomname = this.creep.memory.room;
      const cords = roomname.substr(1).replace("N", ",").replace("S", ",").split(",");
      // console.log('cords: ' + JSON.stringify(cords));
      const north = roomname.includes("N");
      const west = roomname.includes("W");
      for (let x = Number(cords[0]) - 1; x <= Number(cords[0]) + 1; x++) {
        for (let y = Number(cords[1]) - 1; y <= Number(cords[1]) + 1; y++) {
          let str = west ? "W" : "E";
          str += x;
          str += north ? "N" : "S";
          str += y;
          // console.log('x+y: ' + x +'/' +y + 'string: ' + str);

          if (Game.rooms[str] && Game.rooms[str].memory.dangertill && Game.rooms[str].memory.dangertill > Game.time) {
            console.log("found endangered sk room -> help" + str);
            var roompos = new RoomPosition(25, 25, Game.rooms[str].name);
            this.creep.memory.endangeredroom = str;
            this.creep.goTo(roompos);
            return;
          }
        }
      }
      // Game.rooms[this.creep.room.name].memory.dangertill
    }

    if (this.creep.room.name === this.creep.memory.endangeredroom) {
      console.log("this.creep is in endangeredroom -> delete memory");
      delete this.creep.memory.endangeredroom;
    }

    if (this.creep.memory.endangeredroom && this.creep.hits === this.creep.hitsMax) {
      console.log("this.creep has endangeredroom -> goTo " + this.creep.memory.endangeredroom);
      const roompos = new RoomPosition(25, 25, this.creep.memory.endangeredroom);
      this.creep.goTo(roompos);
      return;
    }

    if (this.creep.room.name === this.creep.memory.room) {
      if (this.creep.memory.gatheringpoint) {
        var pos = new RoomPosition(
          this.creep.memory.gatheringpoint.x,
          this.creep.memory.gatheringpoint.y,
          this.creep.memory.gatheringpoint.roomName
        );
        var res = this.creep.moveTo(pos, { reusePath: 0 });
        return;
      }
      if (this.creep.memory.role === "defender" && this.creep.room.name !== this.creep.memory.home) {
        console.log(this.creep.room + "this.creep is defender and no enemy is left -> return home");
        // no action left -> return
        this.creep.memory.room = this.creep.memory.home;
        Game.rooms[this.creep.room.name].memory.dangertill = Game.time - 1;

        var roompos = new RoomPosition(25, 25, this.creep.memory.home);
        this.creep.moveTo(roompos, { ignoreCreeps: true });
        return;
      }
      if (this.creep.memory.home && this.creep.memory.room && this.creep.memory.room === this.creep.memory.home) {
        // console.log('this.creep is at home');
        this.creep.moveTo(this.creep.room.controller);
      }
    } else {
      if (this.creep.memory.gatheringpoint) {
        var pos = new RoomPosition(
          this.creep.memory.gatheringpoint.x,
          this.creep.memory.gatheringpoint.y,
          this.creep.memory.gatheringpoint.roomName
        );
        var res = this.creep.moveTo(pos, { ignoreCreeps: true });
        return;
      }

      if (this.creep.hits < this.creep.hitsMax && this.creep.room.name === this.creep.memory.home) {
        console.log("this.creep is at home"); // don't go yet
        return;
      }

      // else go to room
      let roompos = new RoomPosition(25, 25, this.creep.memory.room);
      const targetroom = Game.rooms[this.creep.memory.room];
      if (this.creep.memory.lasttarget && this.creep.memory.lasttarget.roomName === this.creep.memory.room) {
        roompos = new RoomPosition(
          this.creep.memory.lasttarget.x,
          this.creep.memory.lasttarget.y,
          this.creep.memory.lasttarget.roomName
        );
      } else if (targetroom && targetroom.storage) {
        roompos = targetroom.storage.pos;
      } else if (targetroom && targetroom.controller) {
        roompos = targetroom.controller.pos;
      }
      this.creep.goTo(roompos);
    }
  }
}
