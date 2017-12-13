var roleUpgrader = require('role.upgrader')
var roleBuilder = require('role.builder')
var roleTransporter = require('role.transporter')
var roleAttacker = require('role.attacker')
var roleClaim = require('role.claim')
var roleHealer = require('role.healer')
var roleMineral = require('role.mineral')
var roleDismantler = require('role.dismantler')
var roleKeeper = require('role.keeper')

exports.moveCreeps = function () {
  // creeps

  var attackers = 0, healers = 0, claimers = 0, mineralguys = 0, dismantler = 0, keeper = 0, builder = 0, transporter = 0, sltransporter = 0, harvester = 0, outsider = 0, gatherers = 0
  var total = 0
  var maxcpu = 0
  var maxcreep = ''
  for (var name in Game.creeps) {
    var before = Game.cpu.getUsed()
    var creep = Game.creeps[name]
    if (creep.spawning) {
      continue
    }
    if (creep.memory.role === 'attacker' || creep.memory.role === 'defender' || creep.memory.role === 'Specialdefender') {
      roleAttacker.run(creep)
    } else if (creep.memory.role === 'healer') {
      roleHealer.run(creep)
    } else if (creep.memory.role === 'reserver' || creep.memory.role === 'claim') {
      roleClaim.run(creep)
    } else if (creep.memory.role === 'mineral' || creep.memory.role === 'mineraltransporter') {
      roleMineral.run(creep)
    } else if (creep.memory.role === 'dismantler') {
      roleDismantler.run(creep)
    } else if (creep.memory.role === 'keeper') {
      roleKeeper.run(creep)
      // var diff = Game.cpu.getUsed() - before;
      // keeper++;
      // total += diff;
    } else {
      roleBuilder.run(creep)
      var diff = Game.cpu.getUsed() - before
      if (diff > maxcpu) {
        maxcpu = diff
        maxcreep = creep
      }
      keeper++
      total += diff
    }
    var creeproom = creep.room
    if (!creeproom.memory.sources) {
      var sources = creeproom.find(FIND_SOURCES).map(function (source) {
        return source.pos
      })
      creeproom.memory.sources = sources
    }
  }
  if (keeper > 0) {
    var average = total / keeper
    console.log(keeper + 'builders used ' + average + ' cpu on average per creep')
    if (maxcpu > 10) {
      maxcreep.log(' I am ashamed for using ' + maxcpu)
    }
  }
}
