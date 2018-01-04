let Utils = require('utils');

exports.handleflags = function () {
  for (let flagN in Game.flags) {
    let flag = Game.flags[flagN];

    if (flag.memory.remove) {
      flag.remove();
      continue;
    }

    let sourceRoomName;
    switch (flag.color) {
      case COLOR_WHITE:
        if (Game.time % 200 === 0) {
          let terrain = Game.map.getTerrainAt(flag.pos);
          let visited = flag.memory.visited ? flag.memory.visited : 1;
          let timeout = flag.memory.timeout ? flag.memory.timeout : 0;
          let diff = visited - timeout;
          if (diff >= 1) {
            flag.memory.timeout = (terrain === 'swamp') ? timeout + 4 : timeout + 1;
            // console.log('reducing visited count');
          } else {
            // console.log('flag was not visited enough -> remove flag');
            flag.memory.remove = true;
            flag.remove();
          }
        }
        break;
      case COLOR_YELLOW:
        Memory.gatheringpoint = flag.pos;
        flag.memory.remove = true;
        flag.remove();
        break;
      case COLOR_BROWN:
        sourceRoomName = Utils.findClosestRoom(flag.pos);
        if (sourceRoomName) {
          let slaverooms = Game.rooms[sourceRoomName].memory.slaverooms || [];
          slaverooms.push(flag.pos);
          Game.rooms[sourceRoomName].memory.slaverooms = slaverooms;
          flag.memory.remove = true;
          flag.remove();
        }
        break;
      case COLOR_BLUE:
        sourceRoomName = Utils.findClosestRoom(flag.pos);
        console.log('found claimroom: ' + sourceRoomName);
        Game.rooms[sourceRoomName].memory.claimroom = flag.pos.roomName;
        flag.memory.remove = true;
        flag.remove();
        break;
      case COLOR_GREY:
        if (flag.secondaryColor === COLOR_RED) {
          // console.log('flag detected');

          sourceRoomName = Utils.findClosestRoom(flag.pos);
          Game.rooms[sourceRoomName].memory.lootroom = flag.pos.roomName;
          flag.memory.remove = true;
          flag.remove();
        } else if (flag.secondaryColor === COLOR_BLUE) {
          flag.room.memory.upgradepos = flag.pos;
          flag.remove();
        }
        break;
      case COLOR_ORANGE:
        sourceRoomName = Utils.findClosestRoom(flag.pos);
        Game.rooms[sourceRoomName].memory.attackinprogress = true;
        Game.rooms[sourceRoomName].memory.warroom = flag.pos.roomName;
        flag.remove();
        break;
      case COLOR_RED:
        sourceRoomName = Utils.findClosestRoom(flag.pos);
        Game.rooms[sourceRoomName].memory.guidedattack = true;
        flag.remove();
        Memory.gatheringpoint = null;
        break;
      case COLOR_CYAN:
        sourceRoomName = Utils.findClosestRoom(flag.pos);

        let cords = flag.pos.roomName.substr(1).replace('N', ',').replace('S', ',').split(',');
        if (Number(cords[0]) % 10 === 5 && Number(cords[1]) % 10 === 5) {
          console.log('add central room to list');
          Game.rooms[sourceRoomName].memory.centralroom = flag.pos.roomName;
        } else {
          let keeperrooms = Game.rooms[sourceRoomName].memory.keeperrooms || [];
          keeperrooms.push(flag.pos.roomName);
          Game.rooms[sourceRoomName].memory.keeperrooms = keeperrooms;
        }

        flag.memory.remove = true;
        flag.remove();
        break;
      default:
        console.log('flag.color ' + flag.color + ' has no implementation yet');
    }
  }
};
