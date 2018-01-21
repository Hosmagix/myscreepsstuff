let createReceipe = function (name) {
  return { m1: name.charAt(0), m2: name.charAt(1), res: name};
};

// UH Attack
// KO RangedAttack
// LO Heal
// LH Build
// ZH Dismantle
// ZO Move
// GO -dmg
// GH upgrade controller
// OH
// ZK
// UL
// G

const minMinerals = 20000;
const hasEnough = 200000;

let cachedReactions;
function createReactionsData () {
  if (cachedReactions) {
    return cachedReactions;
  }
  let reactions = {};
  let basicReactions = ['UH', 'KO', 'LO', 'LH', 'ZH', 'ZO', 'ZK', 'UL', 'GO', 'GH', 'OH'];

  basicReactions.forEach(rea => { reactions[rea] = createReceipe(rea); });
  reactions.G = {m1: 'ZK', m2: 'UL', res: 'G'};

  for (let key in REACTIONS.OH) {
    if (REACTIONS.OH.hasOwnProperty(key)) {
      let result = REACTIONS.OH[key];
      let reaction = {m1: 'OH', m2: key, res: result};
      reactions[result] = reaction;
    }
  }

  for (let key in REACTIONS.X) {
    if (REACTIONS.X.hasOwnProperty(key)) {
      let result = REACTIONS.X[key];
      let reaction = {m1: 'X', m2: key, res: result};
      reactions[result] = reaction;
    }
  }
  cachedReactions = reactions;
  return reactions;
}

let findFreeReaction = function () {
  let availableMinerals = updateTotalMinerals();
  // TODO refactor: this is only a dummy implementation
  // it should offer support if all reactions are taken.
  // there should be ways the prioritize stuff.
  // calculate the required minerals -> priotize OH higher.
  let reactions = createReactionsData();

  let takenReactions = Game.getReactions();
  let freeReactions = [];

  console.log('reactions: ' + JSON.stringify(reactions));
  console.log('takenReactions: ' + JSON.stringify(takenReactions));
  console.log('availableMinerals: ' + JSON.stringify(availableMinerals));

  for (let key in reactions) {
    if (Object.prototype.hasOwnProperty.call(reactions, key)) {
      let reaction = reactions[key];
      if (!availableMinerals[reaction.m1] || availableMinerals[reaction.m1] < minMinerals ||
        !availableMinerals[reaction.m2] || availableMinerals[reaction.m2] < minMinerals) {
        // console.log("reaction doesn't have enough supply" + JSON.stringify(key));
      } else if (availableMinerals[reaction.res] && availableMinerals[reaction.res] > hasEnough) {
        console.log('reaction already has enough of its products: ' + JSON.stringify(key));
      } else if (!takenReactions[key]) {
        console.log('reaction is still free' + JSON.stringify(key));
        freeReactions.push(reactions[key]);
      }
    }
  }

  if (freeReactions.length > 0) {
    return freeReactions[0];
  } else {
    console.log('failed to find a free reaction');
  }
};

let addMinerals = function (totalMinerals, storage) { // actually adds energy to but doesn't matter
  for (let mineral in storage.store) {
    if (storage.store.hasOwnProperty(mineral)) {
      let amount = storage.store[mineral];
      let totalAmount = totalMinerals[mineral] || 0;
      totalAmount += amount;
      totalMinerals[mineral] = totalAmount;
    }
  }
};

function updateTotalMinerals () {
  let totalMinerals = {};
  for (let i in Game.rooms) {
    if (Game.rooms.hasOwnProperty(i)) {
      let room = Game.rooms[i];

      if (!room.controller || !room.controller.my) {
        // no room with a controller -> do nothing
        continue;
      }
      if (room.storage) {
        addMinerals(totalMinerals, room.storage);
      }
      if (room.terminal) {
        addMinerals(totalMinerals, room.terminal);
      }
    }
  }
  console.log(JSON.stringify(totalMinerals));
  return totalMinerals;
}

function updateReactionsByRoom () {
  let reactions = {};
  for (let i in Game.rooms) {
    if (Game.rooms.hasOwnProperty(i)) {
      let room = Game.rooms[i];

      if (!room.controller || !room.controller.my) {
        // no room with a controller -> do nothing
        continue;
      }
      if (room.memory.reaction) {
        let reaction = room.memory.reaction;
        reactions[reaction.res] = reactions[reaction.res] || [];
        reactions[reaction.res].push(room.name);
      }
    }
  }
  console.log(JSON.stringify(reactions));
  return reactions;
}

function updateRequestingByRoom () {
  let requesting = {};
  for (let i in Game.rooms) {
    if (Game.rooms.hasOwnProperty(i)) {
      let room = Game.rooms[i];

      if (!room.controller || !room.controller.my) {
        // no room with a controller -> do nothing
        continue;
      }
      if (room.memory.reaction) {
        let reaction = room.memory.reaction;
        requesting[reaction.m1] = requesting[reaction.m1] || [];
        requesting[reaction.m1].push(room.name);
        requesting[reaction.m2] = requesting[reaction.m2] || [];
        requesting[reaction.m2].push(room.name);
      }
    }
  }
  console.log('requesting' + JSON.stringify(requesting));
  return requesting;
}

function deleteRoom (roomId) {
  let room = Game.rooms[roomId];
  room.memory.reaction = undefined;
}

function checkIfFunctionShouldBeChanged () {
  let currentReactions = Game.getReactions();
  let availableMinerals = updateTotalMinerals();
  let reactionsInfo = createReactionsData();
  for (let result in currentReactions) {
    if (currentReactions.hasOwnProperty(result)) {
      let rooms = currentReactions[result];
      let reaction = reactionsInfo[result];
      if (availableMinerals[result] > hasEnough) {
        console.log('there are already enough minerals of: ' + result);
        console.log(JSON.stringify(rooms) + 'shall stop producing ' + result);
        rooms.forEach(deleteRoom);
      } else if (!availableMinerals[reaction.m1] || availableMinerals[reaction.m1] < minMinerals ||
        !availableMinerals[reaction.m2] || availableMinerals[reaction.m2] < minMinerals) {
        console.log("reaction doesn't have enough supply" + result);
        console.log(JSON.stringify(rooms) + 'shall stop producing ' + result);
        rooms.forEach(deleteRoom);
      }
    }
  }
}

module.exports = {findFreeReaction, updateTotalMinerals, updateReactionsByRoom, checkIfFunctionShouldBeChanged, updateRequestingByRoom};
