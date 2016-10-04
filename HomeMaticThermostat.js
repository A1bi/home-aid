'use strict';

var util = require('util');

var HomeMaticDevice = require('./HomeMaticDevice');

module.exports = HomeMaticThermostat;

function HomeMaticThermostat(address, methodCall) {
  HomeMaticDevice.apply(this, arguments);

  this.values.CURRENT_HEATING_STATE = 0;
  this.values.TARGET_HEATING_STATE = 3;
}

util.inherits(HomeMaticThermostat, HomeMaticDevice);

HomeMaticThermostat.prototype.setValue = function (characteristic, value, callback) {
  if (characteristic === 'TARGET_HEATING_STATE') {
    if (value < 2) {
      characteristic = value === 0 ? 'LOWERING_MODE' : 'BOOST_MODE';
      value = true;
      this.temperatureBeforeBoost = this.values.SET_TEMPERATURE;

    } else if (value === 3) {
      characteristic = 'MANU_MODE';
      value = this.temperatureBeforeBoost || 20;

    } else {
      callback();
      return;
    }
  }

  HomeMaticDevice.prototype.setValue.call(this, characteristic, value, callback);
};

HomeMaticThermostat.prototype.applyUpdate = function (characteristic, value) {
  if (characteristic === 'CONTROL_MODE') {
    characteristic = 'CURRENT_HEATING_STATE';
    switch (value) {
      case 3:
        value = 1;
        break;
      default:
        value = 0;
    }
  }

  HomeMaticDevice.prototype.applyUpdate.call(this, characteristic, value);
};
