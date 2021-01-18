import { CreepController } from "./CreepController";

export class App {
  public constructor(private creepController: CreepController) {}
  public init() {
    // Automatically delete memory of missing creeps
    for (const name in Memory.creeps) {
      if (!(name in Game.creeps)) {
        delete Memory.creeps[name];
      }
    }

    for (const name in Memory.creeps) {
      if (!Game.creeps[name]) {
        delete Memory.creeps[name];
      }
    }
    for (const name in Memory.flags) {
      if (!Game.flags[name]) {
        delete Memory.flags[name];
      }
    }

    this.creepController.init();
    this.creepController.move();
  }
}
