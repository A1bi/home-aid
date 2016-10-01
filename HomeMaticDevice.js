'use strict';

var util = require('util');
var EventEmitter = require('events').EventEmitter;

var HomeMatic = require('./HomeMatic');

module.exports = HomeMaticDevice;

HomeMaticDevice.types = {
  Thermostat: 1
};

function HomeMaticDevice(type, address) {
  this.type = type;
  this.address = address;
}

util.inherits(HomeMaticDevice, EventEmitter);

HomeMaticDevice.prototype.getValue = function (characteristic) {

};

HomeMaticDevice.prototype.setValue = function (characteristic, value) {

};

HomeMaticDevice.prototype.applyUpdate = function (characteristic, value) {
  this.emit('update', characteristic, value);
};
