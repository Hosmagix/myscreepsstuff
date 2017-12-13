var roleDismantler = {

    act: function(creep) {
        // console.log('roleAttacker act called');

        var priorityTargets = [];

        for (var flagN in Game.flags) {
            var flag = Game.flags[flagN];
            if (flag.color === COLOR_PURPLE && creep.room.name === flag.pos.roomName) {
                var targets = flag.pos.lookFor(LOOK_STRUCTURES, {
                    filter: {function(s) {return s.structureType !== STRUCTURE_ROAD}}
                });
                if (targets.length > 0) {
                    priorityTargets.push(targets[0]);
                }
            }
        }

        var target = creep.pos.findClosestByRange(priorityTargets);
        if (target !== null) {
            if(creep.dismantle(target )!== OK){
                if (creep.moveTo(target,{reusePath: 0}) == OK){
                    creep.dismantle(target);
                }
            }
            return true;
        }


        // nearbybuildings
        var nearbybuildings = creep.room.find(FIND_HOSTILE_STRUCTURES,{
            filter: (structure) => {
            return (structure.structureType !== STRUCTURE_CONTROLLER && structure.structureType !== STRUCTURE_RAMPART && structure.structureType !== STRUCTURE_KEEPER_LAIR && creep.pos.inRangeTo(structure,1) && structure.structureType !== STRUCTURE_STORAGE && structure.structureType !== STRUCTURE_TERMINAL);
    }
    });

        if (nearbybuildings.length > 0) {

            var target = creep.pos.findClosestByRange(nearbybuildings);
            if(creep.dismantle(target)!== OK){
                if (creep.moveTo(target,{reusePath: 0}) == OK){
                    creep.dismantle(target);
                }
            }
            return true;
        }


        var towers = creep.room.find(FIND_HOSTILE_STRUCTURES,{
            filter: (structure) => {
            return (structure.structureType === STRUCTURE_TOWER);
    }
    });

        if (towers.length > 0) {

            var target = creep.pos.findClosestByRange(towers);
            if(creep.dismantle(target)!== OK){
                if (creep.moveTo(target,{reusePath: 0}) == OK){
                    creep.dismantle(target);
                }
            }
            return true;
        }

        var structures = creep.room.find(FIND_HOSTILE_STRUCTURES,{
            filter: (structure) => {
            return (structure.structureType !== STRUCTURE_CONTROLLER && structure.structureType !== STRUCTURE_RAMPART && structure.structureType !== STRUCTURE_KEEPER_LAIR && structure.structureType !== STRUCTURE_STORAGE && structure.structureType !== STRUCTURE_TERMINAL);

    }
    });

        if (structures.length > 0) {

            var target = creep.pos.findClosestByRange(structures);
            if(creep.dismantle(target )!== OK){
                if (creep.moveTo(target,{reusePath: 0}) == OK){
                    creep.dismantle(target);
                }
            }
            return true;
        }

        /*
        var targets = creep.room.find(FIND_HOSTILE_STRUCTURES,{
            filter: (structure) => {
                return (structure.structureType !== STRUCTURE_CONTROLLER && structure.structureType !== STRUCTURE_KEEPER_LAIR);

            }
        });

        if (targets.length > 0) {
            // console.log('hi');
            var target = creep.pos.findClosestByRange(targets);
            if(creep.dismantle(target )!== OK){
                if (creep.moveTo(target,{reusePath: 0}) == OK){
                    creep.dismantle(target);
                }

            }
            return true;
        }*/

        /*var targets = creep.room.find(FIND_HOSTILE_CONSTRUCTION_SITES);

        if (targets.length > 0) {
            var target = creep.pos.findClosestByRange(targets);
            creep.moveTo(target,{reusePath: 0});

            return true;
        } */

        // damaged

        if (creep.hits < creep.hitsMax){
            // console.log('creep is damaged');

            if (creep.memory.home && creep.memory.home !== creep.room.name){
                // console.log('creep is outside -> go home');
                var homeroom = Game.rooms[creep.memory.home];
                var exitDir = creep.room.findExitTo(homeroom);
                var exit = creep.pos.findClosestByRange(exitDir);
                creep.moveTo(exit);
                return;
            } else {
                // console.log('creep is at home');
                creep.moveTo(creep.room.controller);
            }
            return true;
        }


        return false;

    },


    init: function(creep){
        creep.memory.init = true;
        creep.memory.boost = true;
    },

    /** @param {Creep} creep **/
    run: function(creep) {

        if (!creep.memory.init){
            this.init(creep);
        }

        if (creep.memory.boost){
            for (var i in creep.body){
                var part = creep.body[i];
                if (!part.boost && part.type === WORK){
                    var succ = creep.boost(RESOURCE_ZYNTHIUM_ACID);
                    if (!succ){
                        creep.moveTo(creep.room.controller);
                    }
                    return;
                }
                if (!part.boost && part.type === MOVE){
                    var succ = creep.boost(RESOURCE_ZYNTHIUM_ALKALIDE);
                    if (!succ){
                        creep.moveTo(creep.room.controller);
                    }
                    return;
                }
            }

            creep.memory.boost = false;
        }

        if (!creep.room.controller || (creep.room.controller && !creep.room.controller.safeMode)){
            var actiondone = this.act(creep);
            if (actiondone){
                return;
            }
        } else {
            console.log('safe mode active');
        }

        if (creep.memory.gatheringpoint){

            var pos = new RoomPosition (creep.memory.gatheringpoint.x , creep.memory.gatheringpoint.y , creep.memory.gatheringpoint.roomName );
            //var res = creep.moveTo(pos, {ignoreCreeps: true});
            creep.goTo(pos);
            return;

        }

        if (creep.room.name === creep.memory.room){

            if (creep.memory.home && creep.memory.room && (creep.memory.room === creep.memory.home)){
                //console.log('creep is at home');
                creep.moveTo(creep.room.controller);
            }
            return;

        } else {

            //console.log('no gatheringpoint other room -> move');
            var roompos = new RoomPosition(25,25, creep.memory.room);
            if (creep.memory.lasttarget && creep.memory.lasttarget.roomName === creep.memory.room){
                roompos = new RoomPosition(creep.memory.lasttarget.x, creep.memory.lasttarget.y, creep.memory.lasttarget.roomName);
            }
            creep.goTo(roompos);
            return;

        }
    }
};

module.exports = roleDismantler;