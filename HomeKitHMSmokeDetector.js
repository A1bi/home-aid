'use strict';

var util = require('util');
var HomeKit = require('hap-nodejs');

var HomeKitHMDevice = require('./HomeKitHMDevice');

module.exports = HomeKitHMSmokeDetector;

function HomeKitHMSmokeDetector(accessory, device) {
  var _this = this;

  HomeKitHMDevice.apply(this, arguments);

  this.applyMappings({
    STATE: {
      service: HomeKit.Service.SmokeSensor,
      characteristic: HomeKit.Characteristic.SmokeDetected,
      defaultValue: 0,
      valueConversion: function (value) {
        return value ? 1 : 0;
      }
    },
    LOWBAT: {
      service: HomeKit.Service.SmokeSensor,
      characteristic: HomeKit.Characteristic.StatusLowBattery,
      defaultValue: 0
    }
  });

  this.hmDevice.on('update', function (characteristic, value) {
    if (characteristic === 'UNREACH') {
      var sd = _this.accessory.getService(HomeKit.Service.SmokeSensor);
      sd
        .getCharacteristic(HomeKit.Characteristic.StatusActive)
        .updateValue(!value)
      ;
    }
  });
}

util.inherits(HomeKitHMSmokeDetector, HomeKitHMDevice);
