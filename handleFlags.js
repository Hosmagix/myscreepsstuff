exports.handleflags = function () {
    var removeflags = (Game.cpu.bucket < 300);


    for(let flagN in Game.flags){
        let flag = Game.flags[flagN];

        if (flag.memory.remove){
            flag.remove();
            continue;
        }

        if (flag.color === COLOR_WHITE) {
            if (removeflags){
                flag.remove();
            }

            if (Game.time % 200 === 0){
                var terrain = Game.map.getTerrainAt(flag.pos);
                var visited = flag.memory.visited? flag.memory.visited : 1;
                var timeout = flag.memory.timeout? flag.memory.timeout : 0;
                var diff  = visited - timeout;
                if (diff >= 1){
                    flag.memory.timeout = (terrain === 'swamp')? timeout + 4 : timeout +1;
                    // console.log('reducing visited count');
                } else{
                    // console.log('flag was not visited enough -> remove flag');
                    flag.memory.remove = true;
                    flag.remove();
                }
            }
        }

        else if(flag.color === COLOR_YELLOW){
            Memory.gatheringpoint = flag.pos;
            flag.memory.remove = true;
            flag.remove();
        }
        else if(flag.color === COLOR_GREEN){
            warroom = flag.pos.roomName;
            Memory.warroom = flag.pos.roomName;
            flag.remove();

        }
        else if(flag.color === COLOR_BROWN && !flag.memory.remove){
            var sourceroomname = findClosestRoom(flag.pos);
            // console.log(sourceroomname);
            if (sourceroomname){
                var slaverooms = Game.rooms[sourceroomname].memory.slaverooms || [];
                slaverooms.push(flag.pos);
                Game.rooms[sourceroomname].memory.slaverooms = slaverooms;
                flag.memory.remove = true;
                flag.remove();
            }
        }
        else if(flag.color === COLOR_BLUE && !flag.memory.remove){
            var sourceroomname = findClosestRoom(flag.pos);
            console.log('found claimroom: ' + sourceroomname);
            Game.rooms[sourceroomname].memory.claimroom = flag.pos.roomName;
            flag.memory.remove = true;
            flag.remove();
        }
        else if(flag.color === COLOR_GREY){

            if (flag.secondaryColor === COLOR_RED){
                // console.log('flag detected');

                var sourceroomname = findClosestRoom(flag.pos);
                Game.rooms[sourceroomname].memory.lootroom = flag.pos.roomName;
                flag.memory.remove = true;
                flag.remove();
            } else if (flag.secondaryColor === COLOR_BLUE){
                flag.room.memory.upgradepos = flag.pos;
                flag.remove();
            }
        }
        else if(flag.color === COLOR_ORANGE){
            var sourceroomname = findClosestRoom(flag.pos);
            Game.rooms[sourceroomname].memory.attackinprogress = true;
            Game.rooms[sourceroomname].memory.warroom = flag.pos.roomName;
            flag.remove();
        }
        else if (flag.color === COLOR_RED){
            var sourceroomname = findClosestRoom(flag.pos)
            Game.rooms[sourceroomname].memory.guidedattack = true;
            // Memory.attackinprogress = true;
            flag.remove();
            Memory.gatheringpoint = null;
        }

        else if (flag.color === COLOR_CYAN && !flag.memory.remove){
            var sourceroomname = findClosestRoom(flag.pos);

            var cords = flag.pos.roomName.substr(1).replace('N',',').replace('S',',').split(',');
            if (Number(cords[0])%10 === 5 && Number(cords[1])%10 === 5 ){
                centralroom = true;
                console.log('add central room to list');
                Game.rooms[sourceroomname].memory.centralroom = flag.pos.roomName;
            } else {
                var keeperrooms = Game.rooms[sourceroomname].memory.keeperrooms || [];
                keeperrooms.push(flag.pos.roomName);
                Game.rooms[sourceroomname].memory.keeperrooms = keeperrooms;
            }

            // console.log('keeperrooms: ' + JSON.stringify8keeperrooms);
            flag.memory.remove = true;
            flag.remove();
        }

        else if(flag.color === COLOR_PURPLE){
            // flag.remove();
            // TODO: remove if no building
        }
    }
};

