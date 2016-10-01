'use strict';

var HomeKit = require('hap-nodejs');

var Door = require('./Door');
var Outlets = require('./Outlets');

module.exports = HomeKitServer;

function HomeKitServer() {
  HomeKit.init();

  this._bridge = new HomeKit.Bridge('Home Aid Bridge', HomeKit.uuid.generate('Home Aid Bridge'));
}

HomeKitServer.prototype.addOutlets = function (numberOfOutlets) {
  for (var i = 1; i <= numberOfOutlets; i++) {
    var outlet = this._createAccessory('Outlet ' + i);
    outlet
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

    this._addAccessory(outlet);
  }
};

HomeKitServer.prototype.addDoor = function () {
  var door = this._createAccessory('Door');

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

  this._addAccessory(door);
};

HomeKitServer.prototype.publish = function (pin) {
  this._bridge.publish({
    username: "CC:22:3D:E3:CE:F6",
    port: 51826,
    pincode: pin,
    category: HomeKit.Accessory.Categories.OTHER
  });
};

HomeKitServer.prototype._createAccessory = function (name) {
  var uuid = HomeKit.uuid.generate('home-aid:accessories:' + name);
  var accessory = new HomeKit.Accessory(name, uuid);
  accessory
    .getService(HomeKit.Service.AccessoryInformation)
    .setCharacteristic(HomeKit.Characteristic.Manufacturer, 'Bäsch GmbH')
    .setCharacteristic(HomeKit.Characteristic.Model, 'Eins')
    .setCharacteristic(HomeKit.Characteristic.SerialNumber, '12345678')
  ;
  return accessory;
};

HomeKitServer.prototype._addAccessory = function (accessory) {
  this._bridge.addBridgedAccessory(accessory);
};
