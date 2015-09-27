'use strict';

var HomeKit = require('hap-nodejs');

var Door = require('./Door');
var Outlets = require('./Outlets');

HomeKit.init();
var bridge = new HomeKit.Bridge('Home Aid Bridge', HomeKit.uuid.generate('Home Aid Bridge'));

function createAccessory(name) {
  var uuid = HomeKit.uuid.generate('home-aid:accessories:' + name);
  var accessory = new HomeKit.Accessory(name, uuid);
  accessory
    .getService(HomeKit.Service.AccessoryInformation)
    .setCharacteristic(HomeKit.Characteristic.Manufacturer, 'Bäsch GmbH')
    .setCharacteristic(HomeKit.Characteristic.Model, 'Eins')
    .setCharacteristic(HomeKit.Characteristic.SerialNumber, '12345678')
  ;
  return accessory;
}


// outlets
var numberOfOutlets = 3;
var outletSet = createAccessory('Outlet');

for (var i = 1; i <= numberOfOutlets; i++) {
  outletSet
    .addService(HomeKit.Service.Lightbulb, 'Outlet ' + i, i)
    .getCharacteristic(HomeKit.Characteristic.On)
    .on('set', (function (j) {
      return function (value, callback) {
        Outlets.toggle(j, value);
        callback();
      }
    })(i))
    .on('get', (function (j) {
      return function (callback) {
        callback(null, Outlets.getState(j));
      }
    })(i))
  ;
}

bridge.addBridgedAccessory(outletSet);


// door
var door = createAccessory('Door');

var getDoorState = function (callback) {
  callback(null, HomeKit.Characteristic.LockTargetState.SECURED);
};

var doorOpener = door.addService(HomeKit.Service.LockMechanism, 'Opener');
doorOpener
  .getCharacteristic(HomeKit.Characteristic.LockTargetState)
  .on('set', function (value, callback) {
    Door.triggerOpener();
    callback();
  })
  .on('get', getDoorState)
;
doorOpener
  .getCharacteristic(HomeKit.Characteristic.LockCurrentState)
  .on('get', getDoorState)
;

bridge.addBridgedAccessory(door);

Door.on('bellRang', function () {
  var trigger = function (remaining) {
    Door.triggerBell(100, function () {
      if (remaining > 0) {
        setTimeout(function () {
          trigger(remaining-1);
        }, 100);
      }
    });
  }
  trigger(3);
});


bridge.publish({
  username: "CC:22:3D:E3:CE:F6",
  port: 51826,
  pincode: '031-45-154',
  category: HomeKit.Accessory.Categories.OTHER
});


function exit() {
  Door.exit();
  Outlets.exit();

  console.log('Exiting');
}

process.on('exit', exit);
