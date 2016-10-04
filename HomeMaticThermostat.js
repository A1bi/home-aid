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
    if (value === 1) {
      characteristic = 'BOOST_MODE';
      value = true;
      this.temperatureBeforeBoost = this.values.SET_TEMPERATURE;
      this.values.TARGET_HEATING_STATE = 1;
      this.applyUpdate('CURRENT_HEATING_STATE', 1);

    } else if (value === 3 && this.values.TARGET_HEATING_STATE !== value) {
      this.values.TARGET_HEATING_STATE = value;
      characteristic = 'MANU_MODE';
      value = this.temperatureBeforeBoost || 19;

    } else {
      callback();
      return;
    }
  }

  HomeMaticDevice.prototype.setValue.call(this, characteristic, value, callback);
};

HomeMaticThermostat.prototype.applyUpdate = function (characteristic, value) {
  if (characteristic === 'VALVE_STATE') {
    characteristic = 'CURRENT_HEATING_STATE';
    value = value >= 5 ? 1 : 0;
  }

  HomeMaticDevice.prototype.applyUpdate.call(this, characteristic, value);
};
