import { Attacker } from "./roles/Attacker";
import { Builder } from "./roles/Builder";
import { Claimer } from "./roles/Claimer";
import { Healer } from "./roles/Healer";
// import { RoleMineral } from "./roles/RoleMineral";

export class CreepController {
  public init() {}

  public move() {
    for (const name in Game.creeps) {
      const creep = Game.creeps[name];
      if (creep.spawning) {
        continue;
      }
      if (
        creep.memory.role === "attacker" ||
        creep.memory.role === "defender" ||
        creep.memory.role === "Specialdefender"
      ) {
        const attacker = new Attacker(creep as any);
        attacker.run();
      } else if (creep.memory.role === "healer") {
        const healer = new Healer(creep as any);
        healer.run();
      } else if (creep.memory.role === "reserver" || creep.memory.role === "claim") {
        const claimer = new Claimer(creep as any);
        claimer.run();
      } else if (creep.memory.role === "mineral" || creep.memory.role === "mineraltransporter") {
        // const roleMineral = new RoleMineral(creep as any);
        // roleMineral.run();
      } else if (creep.memory.role === "dismantler") {
        // roleDismantler.run(creep);
      } else if (creep.memory.role === "keeper") {
        // roleKeeper.run(creep);
      } else {
        const builder = new Builder(creep as any);
        builder.run();
      }
      const creeproom = creep.room;
      if (!creeproom.memory.sources) {
        const sources = creeproom.find(FIND_SOURCES).map(function (source) {
          return source.pos;
        });
        creeproom.memory.sources = sources;
      }
    }
  }
}
