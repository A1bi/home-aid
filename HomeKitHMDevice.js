'use strict';

module.exports = HomeKitHMDevice;

function HomeKitHMDevice(accessory, device) {
  this.hmDevice = device;
  this.accessory = accessory;
}

HomeKitHMDevice.prototype.applyMappings = function (mappings) {
  var _this = this;

  for (var hmCharacteristic in mappings) {
    (function (hmCharacteristic) {
      var mapping = mappings[hmCharacteristic];

      var service = _this.accessory.getService(mapping.service);
      if (!service) {
        service = _this.accessory.addService(mapping.service);
      }

      var characteristic = service.getCharacteristic(mapping.characteristic);
      if (!characteristic) {
        characteristic = service.addCharacteristic(mapping.characteristic);
      }

      characteristic
        .on('get', function (callback) {
          var value = _this.hmDevice.getValue(hmCharacteristic);
          value = value || mapping.defaultValue;
          callback(null, value);
        })
        .on('set', function (value, callback) {
          _this.hmDevice.setValue(hmCharacteristic, value, callback);
        })
      ;
    }).call(this, hmCharacteristic);
  }

  this.hmDevice.on('update', function (characteristic, value) {
    var mapping = mappings[characteristic];
    if (!mapping) {
      return;
    }

    var service = _this.accessory.getService(mapping.service);
    var characteristic = service.getCharacteristic(mapping.characteristic);
    if (mapping.valueConversion) {
      value = mapping.valueConversion(value);
    }
    characteristic.updateValue(value);
  });
};
