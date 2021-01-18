import { BuilderCreep } from "../interfaces/MyCreep";
import { BaseRole } from "./BaseRole";

export class Builder extends BaseRole<BuilderCreep> {
  public constructor(creep: BuilderCreep) {
    super(creep);
  }
  public harvest() {
    const harvestQueue: (() => boolean | void)[] = [];

    // other room
    if (this.creep.memory.room && this.creep.room.name !== this.creep.memory.room) {
      harvestQueue.push(() => this.goToOtherRoom());
    }

    if (this.creep.memory.role === "gatherer") {
      harvestQueue.push(() => this.gathererDroppedEnergy());
    }

    if (this.creep.memory.role !== "dumper" && this.creep.memory.role !== "outsider") {
      harvestQueue.push(() => this.generalDroppedEnergy());
    }

    if (this.creep.memory.linkfrom && this.creep.memory.role === "transporter") {
      harvestQueue.push(() => this.getEnergyFromLink());
    }

    if (
      this.creep.memory.sourcepos &&
      (this.creep.memory.role === "sltrans" || this.creep.memory.role === "keepTrans")
    ) {
      harvestQueue.push(() => this.getEnergyFromContainer());
    }

    if (this.creep.memory.sourcepos) {
      harvestQueue.push(() => this.getEnergyFromSource());
    }

    if (this.creep.memory.source !== undefined) {
      harvestQueue.push(() => this.getEnergyFromSourceId());
    }
    // TODO: fix condition
    if (
      (this.creep.room.terminal &&
        this.creep.room.terminal.store.energy > 70000 &&
        this.creep.room.controller!.level < 8) ||
      (this.creep.room.terminal && this.creep.room.terminal.store.energy > 0 && this.creep.memory.role === "looter")
    ) {
      harvestQueue.push(() => this.getEnergyFromTerminal());
    }

    if (this.creep.room.storage) {
      harvestQueue.push(() => this.getEnergyFromClosestLinkOrStorage());
    }

    for (const task of harvestQueue) {
      if (task()) {
        return;
      }
    }

    this.log("tries to harvest but finds nothing");
  }

  public init() {
    const getHarvestID = (room: Room) => {
      const creepList = room.find(FIND_MY_CREEPS);
      const count1 = creepList.filter(
        creep =>
          (creep.memory.role === "builder" || creep.memory.role === "upgrader" || creep.memory.role === "harvester") &&
          (creep as BuilderCreep).memory.source === 1 &&
          (creep.spawning || creep.ticksToLive! > 100)
      ).length;
      const count0 = creepList.filter(
        creep =>
          (creep.memory.role === "builder" || creep.memory.role === "upgrader" || creep.memory.role === "harvester") &&
          (creep as BuilderCreep).memory.source === 0 &&
          (creep.spawning || creep.ticksToLive! > 100)
      ).length;
      this.log(`count 0: ${count0} count1: ${count1}`);
      const res = count1 >= count0 ? 0 : 1;
      this.log(`Target source for new creep: ${res}`);

      return res;
    };

    const room = this.creep.room;
    if (this.creep.memory.role === "harvester") {
      const links = room.find(FIND_STRUCTURES, {
        filter: i => i.structureType === STRUCTURE_LINK
      });

      this.creep.memory.source = getHarvestID(room);

      const sources = room.find(FIND_SOURCES);
      const targetlink = sources[this.creep.memory.source].pos.findClosestByRange(links);
      this.creep.memory.link = targetlink?.pos;
    } else if (
      (this.creep.memory.role === "transporter" || this.creep.memory.role === "specialbuilder") &&
      this.creep.room.memory.haslinks
    ) {
      // transporter transports energy from the links
      const links = room.find(FIND_STRUCTURES, {
        filter: i => i.structureType === STRUCTURE_LINK
      });

      const targetlink = room.storage!.pos.findClosestByRange(links);
      this.creep.memory.linkfrom = targetlink!.pos;
    } else if (this.creep.memory.role === "upgrader") {
      if (!room.memory.haslinks) {
        this.creep.memory.source = getHarvestID(room);
      }
    }
    this.creep.memory.init = true;
  }

  public run(): boolean | void {
    if (!this.creep.memory.init) {
      this.init();
    }

    if (this.creep.memory.dangertill && this.creep.memory.dangertill > Game.time) {
      //  console.log(this.creep.name +' target room might still be in danger -> not returning -> gathering at controller');
      const homeroom = Game.rooms[this.creep.memory.home];
      this.goTo(homeroom.controller!.pos);
      return true;
    }

    if (!this.creep.memory.nofear) {
      if (this.checkForEnemies()) {
        return true;
      }
    } else {
      if (this.checkForKeepers()) {
        return true;
      }
    }

    this.buildRoads();

    if (this.creep.memory.building && this.creep.store.energy === 0) {
      this.creep.memory.building = false;
    }
    if (!this.creep.memory.building && this.creep.store.energy === this.creep.store.getCapacity()) {
      this.creep.memory.building = true;
    }

    if (this.creep.memory.building) {
      return this.spendEnergy();
    }
    return this.harvest();
  }

  spendEnergy() {
    // TODO: refactor this. Calculate this only once for every type of creep

    const spendEnergyQueue: (()=> boolean | void)[] = [];

    if (
      this.creep.memory.role === "sltrans" ||
      this.creep.memory.role === "dumper" ||
      this.creep.memory.role === "outsider"
    ) {
      spendEnergyQueue.push(this.repairContainer);
    }

    if (
      (this.creep.memory.role === "dumper" || this.creep.memory.role === "outsider") &&
      this.creep.memory.room === this.creep.room.name
    ) {
      spendEnergyQueue.push(this.dropOnContainerOrFloor);
    }

    if (this.creep.memory.role === "upgrader") {
      spendEnergyQueue.push(this.upgradeController);
    }

    if (this.creep.memory.link) {
      // TODO: if only harvester -> make check dependant on role
      spendEnergyQueue.push(this.harvesterToLinkIndex);
    }

    spendEnergyQueue.push(this.fillTowers);

    if (
      this.creep.memory.role === "transporter" ||
      (this.creep.memory.role === "builder" &&
        !(this.creep.room.storage && this.creep.room.storage.store.energy < 5000))
    ) {
      spendEnergyQueue.push(this.distributeEnergy);
    }

    if (
      this.creep.memory.role === "transporter" &&
      this.creep.room.terminal &&
      (this.creep.room.terminal.store.energy < 30000 ||
        (this.creep.room.controller?.level === 8 &&
          this.creep.room.terminal.store.energy < 100000 &&
          this.creep.room.storage &&
          this.creep.room.storage.store.energy > 200000))
    ) {
      spendEnergyQueue.push(this.bringEnergyToTerminal);
    }

    if ((this.creep.memory.role === "transporter" || this.creep.memory.role === "builder") && this.creep.room.storage) {
      spendEnergyQueue.push(this.bringEnergyToStorage);
    }

    if (
      this.creep.room.storage &&
      (this.creep.memory.role === "sltrans" ||
        this.creep.memory.role === "keepTrans" ||
        this.creep.memory.role === "gatherer" ||
        this.creep.memory.role === "looter") &&
      this.creep.room.controller &&
      this.creep.room.controller.my
    ) {
      spendEnergyQueue.push(this.bringEnergyToStorageOrClosestLink);
    }

    spendEnergyQueue.push(this.buildStuff);

    if (
      this.creep.memory.role === "specialbuilder" &&
      this.creep.room.controller &&
      this.creep.room.controller.level === 8
    ) {
      spendEnergyQueue.push(this.increaseWallHp);
    }
    if (
      this.creep.room.controller &&
      this.creep.room.controller.my &&
      (!this.creep.room.memory.noupgrade || this.creep.room.controller.ticksToDowngrade < 5000)
    ) {
      spendEnergyQueue.push(this.upgradeController);
    }

    // outside
    if (this.creep.memory.home && this.creep.memory.home !== this.creep.room.name) {
      spendEnergyQueue.push(this.returnHome);
    }

    for (let i = 0; i < spendEnergyQueue.length; i++) {
      const task = spendEnergyQueue[i];
      if (task()) {
        return;
      }
    }

    this.log(this.creep.name + "tries to spend energy but cannnot" + JSON.stringify(spendEnergyQueue));
  }

  private gathererDroppedEnergy(): boolean | void {
    let resources = this.creep.room
      .find(FIND_DROPPED_RESOURCES)
      .filter(res => res.resourceType === RESOURCE_ENERGY && res.amount > 300);

    let target = this.creep.pos.findClosestByRange(resources);

    // console.log('resource:' + JSON.stringify(target));
    if (target) {
      if (this.creep.pickup(target) !== OK) {
        // TODO: check range
        this.goTo(target.pos);
      }
      return true;
    }

    resources = this.creep.room.find(FIND_DROPPED_RESOURCES).filter(function (res) {
      return res.resourceType === RESOURCE_ENERGY;
    });

    target = this.creep.pos.findClosestByRange(resources);

    // console.log('resource:' + JSON.stringify(target));
    if (target) {
      if (this.creep.pickup(target) !== OK) {
        // TODO: check range
        this.goTo(target.pos);
      }
      return true;
    }
  }

  private generalDroppedEnergy(): boolean | void {
    const resources = this.creep.room.find(FIND_DROPPED_RESOURCES).filter(function (res) {
      return res.resourceType === RESOURCE_ENERGY;
    });

    const target = this.creep.pos.findClosestByRange(resources);
    if (target) {
      const range = this.creep.pos.getRangeTo(target);
      if (range <= 1) {
        this.creep.pickup(target);
        // this.creep.moveTo(target);
        return true;
      } else if (range <= 5) {
        this.goTo(target.pos);
        return true;
      }
    }
  }

  private goToOtherRoom() {
    if (this.creep.fatigue) {
      // console.log('fatigue');
      return true;
    }

    // else go to room
    let roompos = null;
    const targetroom = Game.rooms[this.creep.memory.room];
    if (this.creep.memory.lasttarget && this.creep.memory.lasttarget.roomName === this.creep.memory.room) {
      roompos = new RoomPosition(
        this.creep.memory.lasttarget.x,
        this.creep.memory.lasttarget.y,
        this.creep.memory.lasttarget.roomName
      );
    } else if (this.creep.memory.sourcepos) {
      roompos = new RoomPosition(this.creep.memory.sourcepos.x, this.creep.memory.sourcepos.y, this.creep.memory.room);
    } else if (targetroom && targetroom.controller) {
      roompos = targetroom.controller.pos;
    } else {
      roompos = new RoomPosition(25, 25, this.creep.memory.room);
    }
    this.goTo(roompos);
    return true;
  }

  private getEnergyFromLink() {
    if (!this.creep.memory.linkfrom){
      return false;
    }
    const roompos = new RoomPosition(
      this.creep.memory.linkfrom.x,
      this.creep.memory.linkfrom.y,
      this.creep.memory.linkfrom.roomName
    );
    const linkfrom = roompos.lookFor(LOOK_STRUCTURES).filter(function (linki) {
      return linki.structureType === STRUCTURE_LINK;
    });

    if (linkfrom && linkfrom.length > 0 && (linkfrom[0] as StructureLink).store.energy > 200) {
      const link = linkfrom[0];
      // console.log('link: ' + JSON.stringify(link));
      const range = this.creep.pos.getRangeTo(link.pos);
      // console.log('range to link' + range);
      if (range <= 1) {
        const result = this.creep.withdraw(link, RESOURCE_ENERGY);
        // console.log('withdraw result:' + result);
        if (result === -6 && this.creep.memory.role !== "transporter") {
          // -> Storage
        } else {
          return true;
        }
      } else {
        this.goTo(link.pos);
        return true;
      }
    }
    return false;
  }

  private getEnergyFromContainer() {
    // console.log('this.this.creep.name: ' +this.this.creep.name);
    const roompos = new RoomPosition(
      this.creep.memory.sourcepos.x,
      this.creep.memory.sourcepos.y,
      this.creep.memory.room
    );
    // var source = roompos.lookFor(LOOK_SOURCES)[0];
    const container = roompos.findInRange<StructureContainer>(FIND_STRUCTURES, 3).filter(function (structure) {
      return structure.structureType === STRUCTURE_CONTAINER;
    });
    if (container && container.length > 0) {
      const con = roompos.findClosestByRange<StructureContainer>(container)!;

      if (con.store.energy > 0) {
        if (this.creep.withdraw(con, RESOURCE_ENERGY) !== OK) {
          // TODO: check first for distance
          this.goTo(con.pos);
          return true;
        }
      }
    } else {
      console.log("warning: no container found near pos: " + JSON.stringify(roompos));
    }
    return false;
  }

  private getEnergyFromSource() {
    const roompos = new RoomPosition(
      this.creep.memory.sourcepos.x,
      this.creep.memory.sourcepos.y,
      this.creep.memory.room
    );
    const source = roompos.findClosestByRange(FIND_SOURCES)!;

    if (!this.creep.pos.isNearTo(source)) {
      this.goTo(source.pos);
    } else if (source.energy > 0) {
      this.creep.harvest(source);

      const workParts = this.creep.getActiveBodyparts(WORK);
      if (this.creep.carry.energy + workParts * 4 > this.creep.carryCapacity) {
        this.creep.memory.building = true;
      } // 2*2 -> check after gathering if a work part is still necessary
    }
    return true;
  }

  private getEnergyFromSourceId() {
    // TODO: remove and use sourcepos instead
    // console.log('this.creep.name:' + this.creep.name);
    const sources = this.creep.room.find(FIND_SOURCES);
    const id = this.creep.memory.source!;
    const source = sources[id];

    const harvestresult = this.creep.harvest(source);
    if (harvestresult === ERR_NOT_IN_RANGE) {
      this.goTo(source.pos);
    }
    return true;
  }

  private getEnergyFromTerminal() {
    const target = this.creep.room.terminal!;
    if (this.creep.withdraw(target, RESOURCE_ENERGY) !== OK) {
      this.goTo(target.pos); // TODO: check
    }
    return true;
  }

  private getEnergyFromClosestLinkOrStorage() {
    const links = this.creep.room.find(FIND_MY_STRUCTURES).filter(function (structure) {
      return structure.structureType === STRUCTURE_LINK && structure.energy >= 300; // TODO: cache link part
    });
    this.creep.room.storage && links.push(this.creep.room.storage);
    const target = this.creep.pos.findClosestByRange(links);
    if (!target){
      return false;
    }
    if (this.creep.withdraw(target, RESOURCE_ENERGY) !== OK) {
      this.goTo(target.pos);
    }
    return true;
  }

  private repairContainer(): boolean | void {
    const roompos = this.creep.pos;
    // this.log('roompos: ' + roompos);
    const container = roompos.findInRange(FIND_STRUCTURES, 3).filter(function (structure) {
      return structure.structureType === STRUCTURE_CONTAINER && structure.hits < structure.hitsMax;
    });
    if (container && container.length > 0) {
      // console.log('repairing containers')
      this.creep.repair(container[0]);
      return true;
    }
  }

  private dropOnContainerOrFloor() {
    const roompos = new RoomPosition(
      this.creep.memory.sourcepos.x,
      this.creep.memory.sourcepos.y,
      this.creep.memory.room
    );
    const container = roompos.findInRange(FIND_STRUCTURES, 2).filter(function (structure) {
      // TODO: do some cacheing
      return structure.structureType === STRUCTURE_CONTAINER;
    });
    if (container && container.length > 0) {
      const con = container[0];
      const range = this.creep.pos.getRangeTo(con.pos);

      if (range <= 1) {
        const result = this.creep.transfer(con, RESOURCE_ENERGY);
        if (result !== OK) {
          this.creep.drop(RESOURCE_ENERGY, this.creep.store.energy);
        }
        return true;
      } else {
        this.goTo(con.pos);
        return true;
      }
    } else {
      this.log("no container found -> check for construction sites");
      const containerConsts = roompos.findInRange(FIND_CONSTRUCTION_SITES, 2).filter(function (structure) {
        // TODO: do some cacheing
        return structure.structureType === STRUCTURE_CONTAINER;
      });
      if (containerConsts.length > 0) {
        this.log("there is a container to be build");
        const con = containerConsts[0];
        const range = this.creep.pos.getRangeTo(con.pos);

        if (range <= 1) {
          this.creep.build(con);
        } else {
          this.goTo(con.pos);
        }
        return true;
      }

      this.log("no container found -> check if next to source and then build one!");
      if (this.creep.pos.findInRange(FIND_SOURCES, 1).length > 0) {
        this.log("this.creep is next to source -> build container");
        this.creep.pos.createConstructionSite(STRUCTURE_CONTAINER);
      } else {
        this.goTo(roompos);
        this.log("move next to source first");
      }
    }
    return true;
  }

  private upgradeController() {
    if (!this.creep.room.controller){
      return false;
    }
    if (this.creep.upgradeController(this.creep.room.controller) === ERR_NOT_IN_RANGE) {
      // TODO: distance check instead of penalty
      if (this.creep.room.memory.upgradepos) {
        this.creep.moveTo(this.creep.room.memory.upgradepos.x, this.creep.room.memory.upgradepos.y);
      } else {
        this.goTo(this.creep.room.controller.pos);
      }
    }
    return true;
  }

  private harvesterToLinkIndex() {
    if (!this.creep.memory.link){
      return false;
    }
    const roompos = new RoomPosition(
      this.creep.memory.link.x,
      this.creep.memory.link.y,
      this.creep.memory.link.roomName
    );
    const link = roompos.lookFor(LOOK_STRUCTURES).filter(function (linki) {
      // TODO: cache filtered links
      return linki.structureType === STRUCTURE_LINK;
    });

    if (link) {
      const linki = link[0];
      // console.log('haslink ' + JSON.stringify(linki));
      const range = this.creep.pos.getRangeTo(linki.pos);
      // console.log('range to link' + range);
      if (range <= 1) {
        if (this.creep.transfer(linki, RESOURCE_ENERGY) === OK) {
          return true;
        }
        // console.log('this.creep ' + this.creep.name + ' cant transfer enery to the link');
        return true;
      } else {
        this.goTo(linki.pos);
        return true;
      }
    }
    return false;
  }

  private fillTowers(): boolean | void {
    let towerFillTill = 800;
    if (this.creep.room.memory.dangertill && this.creep.room.memory.dangertill > Game.time) {
      towerFillTill = 600; // such that they don't fill at 990
    }

    // bring energy to tower
    const targets = this.creep.room.find<StructureTower>(FIND_STRUCTURES, {
      // TODO: cache filtered towers
      filter: structure => {
        return structure.structureType === STRUCTURE_TOWER && structure.energy < towerFillTill;
      }
    });
    if (targets.length > 0) {
      const target = this.creep.pos.findClosestByRange(targets)!;
      if (this.creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
        // TODO: move closer check first
        this.goTo(target.pos);
      }
      return true;
    }
  }

  private distributeEnergy() {
    const targets = this.creep.room.find(FIND_STRUCTURES, {
      // TODO: cache
      filter: structure => {
        return (
          (structure.structureType === STRUCTURE_EXTENSION ||
            structure.structureType === STRUCTURE_SPAWN ||
            structure.structureType === STRUCTURE_LAB) &&
          structure.energy < structure.energyCapacity
        );
      }
    });
    if (targets.length > 0) {
      const target = this.creep.pos.findClosestByRange(targets)!;
      if (this.creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
        // TODO: check for range
        this.goTo(target.pos);
      }
      return true;
    }
    return false;
  }

  private bringEnergyToTerminal() {
    const terminal = this.creep.room.terminal;
    if (!terminal){
      return false;
    }
    if (this.creep.transfer(terminal, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
      // TODO: check for range
      this.goTo(terminal.pos);
    }
    return true;
  }

  private bringEnergyToStorage() {
    const storage = this.creep.room.storage;
    if (!storage){
      return false;
    }
    if (this.creep.transfer(storage, RESOURCE_ENERGY) !== OK) {
      // TODO: check for range
      this.goTo(storage.pos);
    }
    return true;
  }

  private bringEnergyToStorageOrClosestLink() {
    const storage = this.creep.room.storage;
    const links = this.creep.room.find(FIND_MY_STRUCTURES).filter(function (structure) {
      // TODO: cache
      return structure.structureType === STRUCTURE_LINK && structure.energy <= 600;
    });
    storage && links.push(storage);
    const target = this.creep.pos.findClosestByRange(links);
    // console.log('links: ' + JSON.stringify(links) + ' become ' + JSON.stringify(target));
    if (!target){
      return false;
    }

    if (this.creep.transfer(target, RESOURCE_ENERGY) !== OK) {
      // TODO: check for range
      this.goTo(target.pos);
    }
    return true;
  }

  private buildStuff() {
    const my = this.creep.room.controller && this.creep.room.controller && this.creep.room.controller.my;

    // repairing ramparts
    let test = null;
    let objecthits = 800000;
    if (this.creep.room.memory.wallshp) {
      objecthits = this.creep.room.memory.wallshp;
    } else if (this.creep.room.controller && this.creep.room.controller.level < 4) {
      objecthits = 0;
    }
    if (!this.creep.memory.repairing) {
      objecthits *= 0.8;
    }

    if (my) {
      test = this.creep.pos.findClosestByRange(FIND_STRUCTURES, {
        filter: object => object.hits < 20000 && object.structureType === STRUCTURE_RAMPART
      });

      if (test) {
        // console.log('repairing target:' + JSON.stringify(test));
        if (this.creep.repair(test) === ERR_NOT_IN_RANGE) {
          this.goTo(test.pos);
        }
        return true;
      }
    }

    // build
    const targets = this.creep.room.find(FIND_CONSTRUCTION_SITES).filter(function (constrsite) {
      return constrsite.my;
    });
    if (targets.length > 0) {
      const target = this.creep.pos.findClosestByRange(targets)!;
      // console.log(JSON.stringify(target));
      if (this.creep.build(target) === ERR_NOT_IN_RANGE) {
        const result = this.goTo(target.pos);
        if (result !== OK && result !== ERR_TIRED) {
          console.log(
            `${this.creep.name}wants to move to construction site at ${target.pos}but cannot because${result}`
          );
        }
      }
      return true;
    }

    if (my) {
      test = this.creep.pos.findClosestByRange(FIND_STRUCTURES, {
        filter: object => object.hits < objecthits * 2 && object.structureType === STRUCTURE_RAMPART
      });

      if (test) {
        // console.log('repairing target:' + JSON.stringify(test));
        if (this.creep.repair(test) === ERR_NOT_IN_RANGE) {
          this.goTo(test.pos);
        }
        this.creep.memory.repairing = true;
        return true;
      }

      this.creep.memory.repairing = false;

      test = this.creep.pos.findClosestByRange(FIND_STRUCTURES, {
        filter: object =>
          object.hits < object.hitsMax / 2 && object.structureType !== STRUCTURE_ROAD && object.hits < objecthits
      });

      if (test) {
        // console.log('repairing target:' + JSON.stringify(test));
        if (this.creep.repair(test) === ERR_NOT_IN_RANGE) {
          this.goTo(test.pos);
        }
        return true;
      }
    }
    return false;
  }

  private increaseWallHp() {
    const hasWalls = this.creep.pos.findClosestByRange(FIND_STRUCTURES, {
      filter: object => object.hits < object.hitsMax
    });

    if (hasWalls) {
      console.log(this.creep.room.name + " increasing wallshp");
      this.creep.room.memory.wallshp += 300000;
      this.buildStuff();
    }
    // TODO: suicide if RCL8
  }

  private returnHome(): boolean {
    // console.log(this.creep.name + ' not in homeroom');

    if (this.creep.fatigue) {
      // console.log('fatigue');
      return true;
    }

    const homeroom = Game.rooms[this.creep.memory.home];

    let roomPos = new RoomPosition(25, 25, this.creep.memory.home);
    if (homeroom.storage) {
      roomPos = homeroom.storage.pos;
      // console.log('check1');
    } else {
      roomPos = homeroom.controller!.pos;
    }
    this.goTo(roomPos);
    return true;
  }
}
