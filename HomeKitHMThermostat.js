'use strict';

var util = require('util');
var HomeKit = require('hap-nodejs');

var HomeKitHMDevice = require('./HomeKitHMDevice');

module.exports = HomeKitHMThermostat;

function HomeKitHMThermostat(accessory, device, valveOpenThreshold) {
  var _this = this;
  this.active = false;

  HomeKitHMDevice.apply(this, arguments);

  this.applyMappings({
    BATTERY_STATE: {
      service: HomeKit.Service.BatteryService,
      characteristic: HomeKit.Characteristic.BatteryLevel,
      defaultValue: 100
    },
    SET_TEMPERATURE: {
      service: HomeKit.Service.Thermostat,
      characteristic: HomeKit.Characteristic.TargetTemperature,
      defaultValue: 0
    },
    ACTUAL_TEMPERATURE: {
      service: HomeKit.Service.Thermostat,
      characteristic: HomeKit.Characteristic.CurrentTemperature,
      defaultValue: 0
    }
  });

  this.hmDevice
    .on('ready', function () {
      var thermostat = _this.accessory.getService(HomeKit.Service.Thermostat);
      thermostat
        .getCharacteristic(HomeKit.Characteristic.CurrentHeatingCoolingState)
        .on('get', function (callback) {
          callback(null, _this.active ? 1 : 0);
        })
      ;

      thermostat
        .getCharacteristic(HomeKit.Characteristic.TargetHeatingCoolingState)
        .on('set', function (value, callback) {
          var setCharacteristic;
          if (value === 1) {
            setCharacteristic = 'BOOST_MODE';
            value = true;
            var temp = thermostat.getCharacteristic(HomeKit.Characteristic.TargetTemperature);
            _this.temperatureBeforeBoost = temp.value;

          } else if (value === 3) {
            if (_this.hmDevice.getValue('CONTROL_MODE') !== 1) {
              setCharacteristic = 'MANU_MODE';
              value = _this.temperatureBeforeBoost || 19;
            }
          }

          if (setCharacteristic) {
            _this.hmDevice.setValue(setCharacteristic, value, function () {
              callback();
            });
          } else {
            callback();
          }
        })
        .updateValue(3)
      ;
    })

    .on('update', function (characteristic, value) {
      if (characteristic === 'VALVE_STATE') {
        var active = (value / 100) >= valveOpenThreshold;
        if (active !== _this.active) {
          _this.active = active;

          var thermostat = _this.accessory.getService(HomeKit.Service.Thermostat);
          thermostat
            .getCharacteristic(HomeKit.Characteristic.CurrentHeatingCoolingState)
            .updateValue(active ? 1 : 0)
          ;
        }
      }
    })
  ;
}

util.inherits(HomeKitHMThermostat, HomeKitHMDevice);
