'use strict';

var HomeKit = require('hap-nodejs');

var Door = require('./Door');
var Outlets = require('./Outlets');
var HomeMatic = require('./HomeMatic');
var HomeMaticDevice = require('./HomeMaticDevice');

module.exports = HomeKitServer;

var homeMaticCharacteristicsMappings = {
  'SET_TEMPERATURE': HomeKit.Characteristic.TargetTemperature,
  'ACTUAL_TEMPERATURE': HomeKit.Characteristic.CurrentTemperature,
  'BATTERY_STATE': HomeKit.Characteristic.BatteryLevel,
  'CURRENT_HEATING_STATE': HomeKit.Characteristic.CurrentHeatingCoolingState,
  'TARGET_HEATING_STATE': HomeKit.Characteristic.TargetHeatingCoolingState
};

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

HomeKitServer.prototype.addHomeMatic = function (callback) {
  var _this = this;

  HomeMatic.on('newDevice', function (device) {
    var accessory = _this._createAccessory(device.address);
    var thermostat = accessory.addService(HomeKit.Service.Thermostat);

    device
      .on('ready', function () {
        device.getCharacteristics().forEach(function (characteristicName) {
          var homeKitCharacteristic = homeMaticCharacteristicsMappings[characteristicName];
          if (homeKitCharacteristic) {
            var characteristic = thermostat.getCharacteristic(homeKitCharacteristic);
            if (!characteristic) {
              var characteristic = thermostat.addCharacteristic(homeKitCharacteristic);
            }

            characteristic
              .on('set', function (value, callback, context) {
                if (context != _this) {
                  device.setValue(characteristicName, value, callback);
                } else {
                  callback();
                }
              })
              .on('get', function (callback) {
                device.getValue(characteristicName, function (value) {
                  callback(null, value);
                });
              })
            ;
          }
        });
      })

      .on('update', function (characteristic, value) {
        var homeKitCharacteristic = homeMaticCharacteristicsMappings[characteristic];
        if (homeKitCharacteristic) {
          thermostat.getCharacteristic(homeKitCharacteristic).setValue(value, null, _this);
        }
      })
    ;

    _this._addAccessory(accessory);
  });

  HomeMatic.on('ready', callback);
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
