exports.handleTerminals = function (room) {
  if (!room.terminal || !room.terminal.store) {
    return;
  }
  if (Game.time % 10 === 2) {
    let transitiondone = false;
    let minMinerals = 10000;
    //   console.log(JSON.stringify(room.terminal));
    Object.keys(room.terminal.store).forEach(function (key) { // TODO: remove forEach
      // key: the name of the object key
      let amount = room.terminal.store[key];
      if (amount < minMinerals || transitiondone || key === RESOURCE_ENERGY) return;
      if (amount < 20000 && room.memory.reaction && (room.memory.reaction.m1 === key || room.memory.reaction.m2 === key)) {
        return;
      }

      if (transitiondone) {
        return;
      }

      if (Memory.requesting && Memory.requesting[key]) {
        let rooms = Memory.requesting[key];
        //  room.log('requesting rooms are: ' + rooms);

        for (let i = 0; i < rooms.length; i++) {
          let roomName = rooms[i];
          let roomObject = Game.rooms[roomName];
          let roomMinerals = 0;
          if (roomName === room.name) {
            continue;
            // this is the same room
          }
          if (roomObject.terminal && roomObject.terminal.store[key]) {
            roomMinerals += roomObject.terminal.store[key];
          }
          if (roomObject.storage && roomObject.storage.store[key]) {
            roomMinerals += roomObject.storage.store[key];
          }
          if (roomMinerals < minMinerals) {
            transitiondone = true;
            room.log('transfering ' + amount + ' ' + key + ' to ' + roomName);
            room.terminal.send(key, minMinerals, roomName);
            break;
          }
        }
      }
    });
    if (transitiondone) {
      return;
    }
  }
  // Sell stuff
  if (Game.time % 50 === 0) {
    for (let key in room.terminal.store) {
      if (key === RESOURCE_ENERGY) {
        return;
      }
      if (Object.prototype.hasOwnProperty.call(room.terminal.store, key)) {
        let resource = room.terminal.store[key];
        let storageResource = room.storage.store[key];

        if (resource > 5000 && room.terminal.store.energy >= 30000 && storageResource > 50000) {
          let orders = Game.market.getAllOrders().filter(function (order) {
            return order.resourceType === key && order.type === ORDER_BUY && Game.market.calcTransactionCost(1000, room.name, order.roomName) < 2000;
          });
          console.log('orders:' + JSON.stringify(orders));

          let price = 0;
          let orderid = null;
          let maxamount = 0;
          orders.forEach(function (order) {
            if (order.price > price) {
              price = order.price;
              orderid = order.id;
              maxamount = order.amount;
            }
          });
          if (orderid) {
            let amount = Math.min(Math.min(maxamount, resource), 15000);
            room.log('maxamount: ' + maxamount + ' resource: ' + resource + 'resultingamount: ' + amount);

            let result = Game.market.deal(orderid, amount, room.name);
            room.log('selling ' + key + ': ' + amount + ' result: ' + result);
          }
        }
      }
    }
  }

  if (room.terminal.store.energy > 70000 && room.controller.level === 8 && Memory.energytarget) {
    room.log(room.name + ': found level 8 room -> prepare sending energy away');
    let targetroom = Game.rooms[Memory.energytarget];
    if (targetroom.terminal && targetroom.terminal.store.energy < 150000) {
      let destination = Memory.energytarget;
      let amount = 30000;
      room.terminal.send('energy', amount, destination);
      room.log('transfering ' + amount + ' energy to ' + destination);
    }
  }
};
