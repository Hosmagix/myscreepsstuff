let roleBuilder = require('role.builder');
let roleAttacker = require('role.attacker');
let roleClaim = require('role.claim');
let roleHealer = require('role.healer');
let roleMineral = require('role.mineral');
let roleDismantler = require('role.dismantler');
let roleKeeper = require('role.keeper');

exports.moveCreeps = function () {
  // creeps

  let attackers = 0, healers = 0, claimers = 0, mineralguys = 0, dismantler = 0, keeper = 0, builder = 0, transporter = 0, sltransporter = 0, harvester = 0, outsider = 0, gatherers = 0;
  let total = 0;
  let maxcpu = 0;
  let maxcreep = '';
  for (let name in Game.creeps) {
    let before = Game.cpu.getUsed();
    let creep = Game.creeps[name];
    if (creep.spawning) {
      continue;
    }
    if (creep.memory.role === 'attacker' || creep.memory.role === 'defender' || creep.memory.role === 'Specialdefender') {
      roleAttacker.run(creep);
    } else if (creep.memory.role === 'healer') {
      roleHealer.run(creep);
    } else if (creep.memory.role === 'reserver' || creep.memory.role === 'claim') {
      roleClaim.run(creep);
    } else if (creep.memory.role === 'mineral' || creep.memory.role === 'mineraltransporter') {
      roleMineral.run(creep);
    } else if (creep.memory.role === 'dismantler') {
      roleDismantler.run(creep);
    } else if (creep.memory.role === 'keeper') {
      roleKeeper.run(creep);
      // var diff = Game.cpu.getUsed() - before;
      // keeper++;
      // total += diff;
    } else {
      roleBuilder.run(creep);
      let diff = Game.cpu.getUsed() - before;
      if (diff > maxcpu) {
        maxcpu = diff;
        maxcreep = creep;
      }
      keeper++;
      total += diff;
    }
    let creeproom = creep.room;
    if (!creeproom.memory.sources) {
      let sources = creeproom.find(FIND_SOURCES).map(function (source) {
        return source.pos;
      });
      creeproom.memory.sources = sources;
    }
  }
  if (keeper > 0) {
    let average = total / keeper;
    console.log(keeper + 'builders used ' + average + ' cpu on average per creep');
    if (maxcpu > 10) {
      maxcreep.log(' I am ashamed for using ' + maxcpu);
    }
  }
};
