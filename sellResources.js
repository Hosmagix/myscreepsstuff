exports.sellResources =  function () {


    var oxygen = room.terminal.store[RESOURCE_OXYGEN];
    var storageoxygen = room.storage.store[RESOURCE_OXYGEN];

    // room.log('selling' + oxygen + ' storage: ' + storageoxygen);
    if (oxygen > 5000 && room.terminal.store.energy >= 30000 && storageoxygen > 50000){
        var orders = Game.market.getAllOrders().filter(function(order){
            return order.resourceType === RESOURCE_OXYGEN && order.type === ORDER_BUY && Game.market.calcTransactionCost(1000, room.name, order.roomName) < 2000;
        });
        console.log('orders:' + JSON.stringify(orders));

        var price = 0;
        var orderid = null;
        var maxamount = 0;
        orders.forEach(function(order){
            if (order.price > price){
                price = order.price;
                orderid = order.id;
                maxamount = order.amount;
            }
        });
        if (orderid){


            var amount = Math.min(Math.min(maxamount, oxygen), 15000);
            room.log('maxamount: ' + maxamount + ' oxygen: ' + oxygen + 'resultingamount: ' + amount);

            var result = Game.market.deal(orderid, amount, room.name);
            room.log('selling oxygen: ' + amount + ' result: ' + result);
        }
    }


    var oxygen = room.terminal.store[RESOURCE_LEMERGIUM_OXIDE];
    var storageoxygen = room.storage.store[RESOURCE_LEMERGIUM_OXIDE];

    // room.log('selling' + oxygen + ' storage: ' + storageoxygen);
    if (oxygen > 5000 && room.terminal.store.energy >= 30000 && storageoxygen > 500000){
        var orders = Game.market.getAllOrders().filter(function(order){
            return order.resourceType === RESOURCE_LEMERGIUM_OXIDE && order.type === ORDER_BUY && Game.market.calcTransactionCost(1000, room.name, order.roomName) < 2000;
        });
        console.log('orders:' + JSON.stringify(orders));

        var price = 0;
        var orderid = null;
        var maxamount = 0;
        orders.forEach(function(order){
            if (order.price > price){
                price = order.price;
                orderid = order.id;
                maxamount = order.amount;
            }
        });
        if (orderid){


            var amount = Math.min(Math.min(maxamount, oxygen), 15000);
            room.log('maxamount: ' + maxamount + ' RESOURCE_LEMERGIUM_OXIDE: ' + oxygen + 'resultingamount: ' + amount);

            var result = Game.market.deal(orderid, amount, room.name);
            room.log('selling RESOURCE_LEMERGIUM_OXIDE: ' + amount + ' result: ' + result);
        }
    }






    var oxygen = room.terminal.store[RESOURCE_ZYNTHIUM];
    if (oxygen > 50000 && room.terminal.store.energy >= 30000){
        var orders = Game.market.getAllOrders().filter(function(order){
            return order.resourceType === RESOURCE_ZYNTHIUM && order.type === ORDER_BUY && Game.market.calcTransactionCost(1000, room.name, order.roomName) < 1000;
        });
        // console.log('orders:' + JSON.stringify(orders));

        var price = 0;
        var orderid = null;
        var maxamount = 0;
        orders.forEach(function(order){
            if (order.price > price){
                price = order.price;
                orderid = order.id;
                maxamount = order.amount;
            }
        });
        if (orderid){

            var amount = Math.min(Math.max(maxamount, oxygen -20000), 30000);

            var result = Game.market.deal(orderid, amount, room.name);
            console.log('selling zynthium: ' + amount + ' result: ' + result);
        }
    }
};