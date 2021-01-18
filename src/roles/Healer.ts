import { HealerCreep } from "../interfaces/MyCreep";
import { BaseRole } from "./BaseRole";

export class Healer extends BaseRole<HealerCreep> {
  public constructor(creep: HealerCreep) {
    super(creep);
  }

  public run() {
    if (this.creep.memory.boost) {
      for (const bodyItem of this.creep.body) {
        const part = bodyItem;
        if (!part.boost && part.type === HEAL) {
          this.boost(RESOURCE_LEMERGIUM_OXIDE);
          return;
        }
      }

      this.creep.memory.boost = false;
    }

    let actiondone = this.act();
    if (actiondone) {
      return;
    }
    if (!this.creep.room.controller || (this.creep.room.controller && !this.creep.room.controller.safeMode)) {
      if (this.creep.room.name === this.creep.memory.room) {
        actiondone = this.afteract();
      }
      if (actiondone) {
        return;
      }
    }

    if (this.creep.memory.gatheringpoint) {
      const pos = new RoomPosition(
        this.creep.memory.gatheringpoint.x,
        this.creep.memory.gatheringpoint.y,
        this.creep.memory.gatheringpoint.roomName
      );
      this.goTo(pos);
      // var res = this.creep.moveTo(pos, {ignoreCreeps: true});
      return;
    }

    if (this.creep.memory.room !== this.creep.room.name) {
      let roompos = new RoomPosition(25, 25, this.creep.memory.room);
      if (this.creep.memory.lasttarget && this.creep.memory.lasttarget.roomName === this.creep.memory.room) {
        roompos = new RoomPosition(
          this.creep.memory.lasttarget.x,
          this.creep.memory.lasttarget.y,
          this.creep.memory.lasttarget.roomName
        );
      }
      this.goTo(roompos);

      return;
    }

    this.afteract();
  }

  public act(): boolean | void {
    const healpower = this.creep.getActiveBodyparts(HEAL) * 12;
    // console.log('healpower');
    // heal prio
    const prioTarget = this.creep.pos.findClosestByRange(FIND_MY_CREEPS, {
      filter(mc) {
        return mc.hits + healpower * 5 <= mc.hitsMax;
      }
    });

    // console.log(JSON.stringify(target));
    if (prioTarget) {
      if (this.creep.heal(prioTarget) === ERR_NOT_IN_RANGE) {
        this.creep.rangedHeal(prioTarget);
        this.creep.moveTo(prioTarget, { reusePath: 0 });
      } else {
        this.afteract();
      }
      return true;
    }

    // heal all
    const target = this.creep.pos.findClosestByRange(FIND_MY_CREEPS, {
      filter(mc) {
        return mc.hits < mc.hitsMax;
      }
    });

    // console.log(JSON.stringify(target));
    if (target) {
      if (this.creep.heal(target) === ERR_NOT_IN_RANGE) {
        this.creep.rangedHeal(target);
        this.creep.moveTo(target, { reusePath: 0 });
      } else {
        this.afteract();
      }
      return true;
    }
  }

  public afteract() {
    const healpower = this.creep.getActiveBodyparts(HEAL) * 12;
    // heal prio
    var target = this.creep.pos.findClosestByRange(FIND_MY_CREEPS, {
      filter(mc) {
        return mc.hits + healpower <= mc.hitsMax;
      }
    });

    if (target) {
      this.creep.moveTo(target, { reusePath: 0 });
      return true;
    }

    /*
          var towers = this.creep.room.find(FIND_HOSTILE_STRUCTURES,{
              filter: (structure) => {
                  return (structure.structureType === STRUCTURE_TOWER);
              }
          }); */

    var target = this.creep.pos.findClosestByRange(FIND_MY_CREEPS, {
      filter(mc) {
        return mc.memory.role === "attacker" || mc.memory.role === "dismantler";
      }
    });
    if (target !== null) {
      this.creep.moveTo(target, { reusePath: 0 });
      // console.log('move after');
      return true;
    }
    return false;
  }
}
