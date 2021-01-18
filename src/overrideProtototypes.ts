const findReaction = require("findReaction");

export function overridePrototypes() {
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
      const costs = new PathFinder.CostMatrix();

      this.find(FIND_STRUCTURES).forEach(function (structure) {
        if (structure.structureType === STRUCTURE_ROAD) {
          // Favor roads over plain tiles
          costs.set(structure.pos.x, structure.pos.y, 1);
        } else if (
          structure.structureType !== STRUCTURE_CONTAINER &&
          (structure.structureType !== STRUCTURE_RAMPART || !structure.my)
        ) {
          // Can't walk through non-walkable buildings
          costs.set(structure.pos.x, structure.pos.y, 0xff);
        }
      });

      this.find(FIND_CONSTRUCTION_SITES).forEach(function (construcitonsite) {
        if (
          construcitonsite.structureType !== STRUCTURE_ROAD &&
          construcitonsite.structureType !== STRUCTURE_CONTAINER &&
          construcitonsite.structureType !== STRUCTURE_RAMPART
        ) {
          costs.set(construcitonsite.pos.x, construcitonsite.pos.y, 0xff);
        }
      });

      this.matrix1 = costs;
      const storedmatrix = {};
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
        filter(mc) {
          return mc.hits < mc.hitsMax;
        }
      });
    }
    return this._friendlyDamagedCreeps;
  };

  let reactions;

  Game.getReactions = function () {
    if (!reactions) {
      reactions = findReaction.updateReactionsByRoom();
    }
    return reactions;
  };
}
