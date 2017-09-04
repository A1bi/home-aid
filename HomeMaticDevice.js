'use strict';

var util = require('util');
var EventEmitter = require('events').EventEmitter;

var HomeMatic = require('./HomeMatic');

module.exports = HomeMaticDevice;

function HomeMaticDevice(type, address, methodCall) {
  this.type = type;
  this.address = address;
  this.methodCall = methodCall;
  this.characteristics = [];
  this.values = {};

  this.methodCall('getParamset', [this.address, 'VALUES'], function (err, res) {
    for (var characteristic in res) {
      this.updateValue(characteristic, res[characteristic]);
    }
    this.emit('ready');
  }.bind(this));
}

util.inherits(HomeMaticDevice, EventEmitter);

HomeMaticDevice.prototype.getValue = function (characteristic, callback) {
  callback(this.values[characteristic]);
};

HomeMaticDevice.prototype.setValue = function (characteristic, value, callback) {
  console.log('setting value', characteristic, value);
  if (typeof value === 'number') {
    value = value.toFixed(1);
  }
  this.methodCall('setValue', [this.address, characteristic, value], function (err) {
    callback(err);
  });
};

HomeMaticDevice.prototype.updateValue = function (characteristic, value) {
  if (characteristic === 'BATTERY_STATE') {
    value = parseInt((value - 1.5) / 3.1 * 100);
  }

  if (this.values[characteristic] !== value) {
    this.values[characteristic] = value;
    return true;
  }

  return false;
};

HomeMaticDevice.prototype.applyUpdate = function (characteristic, value) {
  if (this.updateValue(characteristic, value)) {
    this.emit('update', characteristic, value);
  }
};

HomeMaticDevice.prototype.getCharacteristics = function () {
  return Object.keys(this.values);
};
