'use strict';

var util = require('util');
var EventEmitter = require('events').EventEmitter;

var HomeMatic = require('./HomeMatic');

var debounceTimers = {};

module.exports = HomeMaticDevice;

function HomeMaticDevice(address, methodCall) {
  this.address = address;
  this.methodCall = methodCall;
  this.characteristics = [];
  this.values = {};

  this.methodCall('getParamset', [this.address, 'VALUES'], function (err, res) {
    for (var characteristic in res) {
      this.values[characteristic] = res[characteristic];
    }
    this.emit('ready');
  }.bind(this));
}

util.inherits(HomeMaticDevice, EventEmitter);

HomeMaticDevice.prototype.getValue = function (characteristic, callback) {
  callback(this.values[characteristic]);
};

HomeMaticDevice.prototype.setValue = function (characteristic, value, callback, immediately) {
  clearTimeout(debounceTimers[characteristic]);
  debounceTimers[characteristic] = setTimeout(function () {
    console.log('setting value', characteristic, value);
    if (typeof value === 'number') {
      value = value.toFixed(1);
    }
    this.methodCall('setValue', [this.address, characteristic, value]);
  }.bind(this), immediately ? 0 : 1000);

  callback();
};

HomeMaticDevice.prototype.applyUpdate = function (characteristic, value) {
  this.values[characteristic] = value;
  this.emit('update', characteristic, value);
};

HomeMaticDevice.prototype.getCharacteristics = function () {
  return Object.keys(this.values);
};
