exports.createCreepComponents = function (spawn, maxcapacity) {
  let capacity = spawn.room.energyCapacityAvailable;
  if (maxcapacity && capacity > maxcapacity) {
    capacity = maxcapacity;
  }

  if (capacity >= 3300) {
    capacity = 3300;
  }
  // capacity = spawn.room.energyAvailable;
  // console.log('Room capacity' + capacity);
  let components = [CARRY, MOVE, WORK];
  let remainingcapacity = capacity - 200;

  while (remainingcapacity >= 200) {
    components.push(WORK);
    components.push(MOVE);
    components.push(CARRY);
    remainingcapacity = remainingcapacity - 200;
  }

  while (remainingcapacity >= 150) {
    components.push(WORK);
    components.push(MOVE);
    remainingcapacity = remainingcapacity - 150;
  }

  while (remainingcapacity >= 100) {
    components.push(MOVE);
    components.push(CARRY);
    remainingcapacity = remainingcapacity - 100;
  }
  // console.log(JSON.stringify(components));
  // components.
  return components;
};

exports.createWorkFocussedCreep = function (spawn, maxcapacity) {
  let capacity = spawn.room.energyCapacityAvailable;
  if (maxcapacity && capacity > maxcapacity) {
    capacity = maxcapacity;
  }

  let work = 1;
  let move = 1;
  let carry = 1;

  let components = [];

  if (capacity >= 3500) {
    capacity = 3500;
  }
  let remainingcapacity = capacity - 200;

  while (remainingcapacity >= 450) {
    work += 3;
    move += 2;
    carry++;
    remainingcapacity -= 450;
  }

  while (remainingcapacity >= 200) {
    work++;
    move++;
    carry++;
    remainingcapacity -= 200;
  }

  while (remainingcapacity >= 150) {
    work++;
    move++;
    remainingcapacity = remainingcapacity - 150;
  }

  while (remainingcapacity >= 100) {
    move++;
    carry++;
    remainingcapacity = remainingcapacity - 100;
  }
  for (var i = 0; i < carry; i++) {
    components.push(CARRY);
  }

  for (var i = 0; i < work; i++) {
    components.push(WORK);
  }
  for (var i = 0; i < move; i++) {
    components.push(MOVE);
  }

  // console.log(JSON.stringify(components));
  return components;
};

// createDismantleCreep

exports.createDismantleCreep = function (spawn, boostlevel) {
  // boostlevel 1 , 2, 3
  let capacity = spawn.room.energyCapacityAvailable;
  var boostlevel = boostlevel || 0;

  let work = 0;
  let move = 0;
  let parts = 0;

  let components = [];
  let remainingcapacity = capacity;

  while (remainingcapacity >= 150 && parts <= 48) {
    work += boostlevel + 1;
    move++;
    parts += 2 + boostlevel;
    remainingcapacity = remainingcapacity - 150 - 100 * boostlevel;
  }

  if (parts > 50) {
    work = work - parts + 50;
  }

  for (var i = 0; i < move; i++) {
    components.push(MOVE);
  }
  for (var i = 0; i < work; i++) {
    components.push(WORK);
  }

  console.log(JSON.stringify(components));
  return components;
};

exports.createWarCreep = function (spawn) {
  let capacity = spawn.room.energyCapacityAvailable;
  console.log(capacity);

  if (capacity > 3250) {
    capacity = 3250;
  }

  let tough = 0;
  let move = 0;
  let attack = 0;

  let remainingcapacity = capacity;

  while (remainingcapacity >= 130) {
    move++;
    attack++;
    remainingcapacity -= 130;
  }
  while (remainingcapacity >= 60) {
    tough++;
    move++;
    remainingcapacity -= 60;
  }

  let components = [];

  for (var i = 0; i < tough; i++) {
    components.push(TOUGH);
  }
  for (var i = 0; i < move; i++) {
    components.push(MOVE);
  }
  for (var i = 0; i < attack; i++) {
    components.push(ATTACK);
  }

  // console.log(JSON.stringify(components));
  return components;
};

exports.createRangedCreep = function (spawn, someheal) {
  let capacity = spawn.room.energyCapacityAvailable;
  console.log(capacity);

  let tough = 0;
  let move = 0;
  let rangedattack = 0;
  let parts = 0;
  let heal = 0;
  let remainingcapacity = capacity;

  if (someheal && remainingcapacity > 2500) {
    parts = 8;
    heal = 4;
    move = 4;
    remainingcapacity = capacity - 1200;
  } else if (someheal && remainingcapacity > 600) {
    parts = 2;
    heal = 1;
    move = 1;
    remainingcapacity = capacity - 300;
  }

  while (remainingcapacity >= 200 && parts <= 48) {
    move++;
    rangedattack++;
    remainingcapacity -= 200;
    parts += 2;
  }
  while (remainingcapacity >= 60 && parts <= 48) {
    tough++;
    move++;
    remainingcapacity -= 60;
    parts += 2;
  }

  let components = [];

  for (var i = 0; i < tough; i++) {
    components.push(TOUGH);
  }

  for (var i = 0; i < move; i++) {
    components.push(MOVE);
  }
  for (var i = 0; i < rangedattack; i++) {
    components.push(RANGED_ATTACK);
  }
  for (var i = 0; i < heal; i++) {
    components.push(HEAL);
  }
  console.log(JSON.stringify(components));
  return components;
};

exports.createHealCreep = function (spawn) {
  let capacity = spawn.room.energyCapacityAvailable;
  // console.log(capacity);

  let tough = 0;
  let move = 0;
  let heal = 0;
  let parts = 0;

  let remainingcapacity = capacity;

  while (remainingcapacity >= 300 && parts <= 48) {
    move++;
    heal++;
    parts += 2;
    remainingcapacity -= 300;
  }
  while (remainingcapacity >= 60 && parts <= 48) {
    tough++;
    move++;
    remainingcapacity -= 60;
    parts += 2;
  }

  let components = [];

  for (var i = 0; i < tough; i++) {
    components.push(TOUGH);
  }
  for (var i = 0; i < move; i++) {
    components.push(MOVE);
  }
  for (var i = 0; i < heal; i++) {
    components.push(HEAL);
  }

  // console.log(JSON.stringify(components));
  return components;
};

exports.createClaimCreep = function (spawn) {
  let capacity = spawn.room.energyCapacityAvailable;
  if (capacity > 4000) {
    capacity = 4000;
  }
  // capacity = spawn.room.energyAvailable;
  // console.log('Room capacity' + capacity);
  let components = [];
  let remainingcapacity = capacity;

  while (remainingcapacity >= 700) {
    components.push(CLAIM);
    components.push(MOVE);
    components.push(MOVE);
    remainingcapacity = remainingcapacity - 700;
  }

  // console.log(JSON.stringify(components));
  // components.
  return components;
};

exports.createTransporterCreep = function (spawn, maxCarryParts) { // 1 move 2 carry
  let capacity = spawn.room.energyCapacityAvailable;
  let maxMove = Math.floor(capacity / 150);
  let numMove = Math.min(maxCarryParts / 2, maxMove, 16);

  let components = [];

  for (let i = 0; i < numMove * 2; i++) {
    components.push(CARRY);
  }

  for (let i = 0; i < numMove; i++) {
    components.push(MOVE);
  }
  return components;
};

exports.createTransporterCreepWithWork = function (spawn, maxCarryParts) { // 1 move 2 carry
  let capacity = spawn.room.energyCapacityAvailable;
  let workParts = maxCarryParts > 16 ? 2 : 1;

  let maxMove = Math.floor((capacity - workParts * 50) / 150); // workParts cost 50 more than carry
  let numMove = Math.min((maxCarryParts + workParts) / 2, maxMove, 16);

  let components = [];

  for (let i = 0; i < workParts; i++) {
    components.push(WORK);
  }

  for (let i = 0; i < numMove * 2 - workParts; i++) {
    components.push(CARRY);
  }

  for (let i = 0; i < numMove; i++) {
    components.push(MOVE);
  }
  return components;
};
