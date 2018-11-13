'use strict';

var HomeKit = require('hap-nodejs');

var Door = require('./Door');
var Outlets = require('./Outlets');
var Heater = require('./Heater');
var HomeMatic = require('./HomeMatic');
var HomeKitHMThermostat = require('./HomeKitHMThermostat');
var HomeKitHMSmokeDetector = require('./HomeKitHMSmokeDetector');

var deviceMapping = {
  'CLIMATECONTROL_RT_TRANSCEIVER': HomeKitHMThermostat,
  'SMOKE_DETECTOR': HomeKitHMSmokeDetector
};

module.exports = HomeKitServer;

function HomeKitServer() {
  HomeKit.init();

  this._bridge = new HomeKit.Bridge('Home Aid Bridge', HomeKit.uuid.generate('Home Aid Bridge'));
}

HomeKitServer.prototype.addOutlets = function (numberOfOutlets) {
  for (var i = 1; i <= numberOfOutlets; i++) {
    var outlet = this._createAccessory('Outlet ' + i);
    outlet
      .addService(HomeKit.Service.Outlet, 'Outlet ' + i, i)
      .updateCharacteristic(HomeKit.Characteristic.OutletInUse, true)
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

HomeKitServer.prototype.addDoor = function (_cb) {
  var door = this._createAccessory('Door');

  var doorOpener = door.addService(HomeKit.Service.LockMechanism, 'Opener');
  doorOpener
    .getCharacteristic(HomeKit.Characteristic.LockTargetState)
    .on('set', function (value, callback) {
      if (_cb) _cb();
      Door.triggerOpener();
      callback();
    })
    .on('get', function (callback) {
      callback(null, HomeKit.Characteristic.LockTargetState.SECURED);
    })
  ;
  doorOpener
    .getCharacteristic(HomeKit.Characteristic.LockCurrentState)
    .on('get', function (callback) {
      callback(null, HomeKit.Characteristic.LockCurrentState.SECURED);
    })
  ;

  Door.on('triggered', function (state) {
    var value = state ? HomeKit.Characteristic.LockCurrentState.UNSECURED : HomeKit.Characteristic.LockCurrentState.SECURED;
    doorOpener.updateCharacteristic(HomeKit.Characteristic.LockCurrentState, value);
    value = state ? HomeKit.Characteristic.LockTargetState.UNSECURED : HomeKit.Characteristic.LockTargetState.SECURED;
    doorOpener.updateCharacteristic(HomeKit.Characteristic.LockTargetState, value);
  });

  this._addAccessory(door);
};

HomeKitServer.prototype.addHomeMatic = function (callback) {
  var _this = this;

  HomeMatic.on('newDevice', function (device) {
    var accessory = _this._createAccessory(device.address);
    var deviceClass = deviceMapping[device.type];
    new deviceClass(accessory, device);
    _this._addAccessory(accessory);
  });

  _this._bridge.on('identify', function (paired, callback) {
    if (paired) {
      HomeMatic.togglePairing(true);
    }
    callback();
  });

  HomeMatic.on('ready', callback);
};

HomeKitServer.prototype.addHeater = function () {
  var heater = this._createAccessory('Heater');

  var heaterActive = heater.addService(HomeKit.Service.Switch, 'Heater');
  var heaterActiveOn = heaterActive.getCharacteristic(HomeKit.Characteristic.On);
  heaterActiveOn
    .on('set', function (value, callback) {
      Heater.setActive(value);
      callback();
    })
    .on('get', function (callback) {
      callback(null, Heater.getActiveState());
    })
  ;

  Heater.on('activeStateChanged', function (state) {
    heaterActiveOn.updateValue(state);
  });

  this._addAccessory(heater);
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
    .setCharacteristic(HomeKit.Characteristic.Manufacturer, 'Foo GmbH')
    .setCharacteristic(HomeKit.Characteristic.Model, 'Eins')
    .setCharacteristic(HomeKit.Characteristic.SerialNumber, '12345678')
  ;
  return accessory;
};

HomeKitServer.prototype._addAccessory = function (accessory) {
  accessory.bridged = true;
  this._bridge.addBridgedAccessory(accessory);
};
