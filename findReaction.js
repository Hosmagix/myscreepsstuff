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

module.exports.findFreeReaction = function () {
  // TODO refactor: this is only a dummy implementation
  // it should offer support if all reactions are taken.
  // there should be ways the prioritize stuff.
  // calculate the required minerals -> priotize OH higher.
  let reactions = {};
  let basicReactions = ['UH', 'KO', 'LO', 'LH', 'ZH', 'ZO', 'ZK', 'UL', 'GO', 'GH', 'OH'];

  basicReactions.forEach(rea => { reactions.rea = createReceipe(rea); });
  reactions.G = {m1: 'ZK', m2: 'UL', res: 'G'};

  Memory.reactions = Memory.reactions || {};

  let freeReactions = [];

  for (let key in reactions) {
    if (Object.prototype.hasOwnProperty.call(reactions, key)) {
      if (!Memory.reactions[key]) {
        console.log('reaction is still free' + key);
        freeReactions.push(reactions[key]);
      }
    }
  }

  if (freeReactions.length > 0) {
    return freeReactions[0];
  }
};
