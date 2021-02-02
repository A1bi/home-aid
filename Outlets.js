'use strict';

var EventEmitter = require('events').EventEmitter;
var Gpio = require('onoff').Gpio;
var sleep = require('sleep');

var emitter = new EventEmitter();

var transmitter = new Gpio(22, 'out');

var states = [];
var dependencies = {};
var parents = {};

function sendBitPart(part, duration) {
  transmitter.writeSync(part);
  sleep.usleep(200 * duration);
}

function sendBit(bit) {
  bit = bit ? 1 : 0;

  switch (bit) {
    case 0:
      sendBitPart(1, 1);
      sendBitPart(0, 3);
      sendBitPart(1, 3);
      sendBitPart(0, 1);
      break;
    case 1:
      sendBitPart(1, 1);
      sendBitPart(0, 3);
      sendBitPart(1, 1);
      sendBitPart(0, 3);
      break;
  }
}

function sendValue(value, bitLength) {
  for (var i = bitLength-1; i >= 0; i--) {
    sendBit((value >> i) & 1);
  }
}

function sendSync() {
  sendBitPart(1, 1);
  sendBitPart(0, 20);
}

function toggle(number, state) {
  state = !!state;

  if (getState(number) === state) {
    return;
  }
  states[number] = state;

  var parent = dependencies[number];
  if (state && parent && !getState(parent)) {
    toggle(parent, true);
    sleep.sleep(1);
  }

  for (var i = 0; i < 6; i++) {
    sendValue(0x19, 5);

    sendValue(number, 5);

    sendBit(state);
    sendBit(!state);

    sendSync();
  }

  if (!state && parent) {
    var siblingsOff = parents[parent].every(function (sibling) {
      return !getState(sibling);
    });
    if (siblingsOff) {
      sleep.msleep(200);
      toggle(parent, false);
    }
  }

  emitter.emit('stateChanged', number, state);
}

function getState(number) {
  return states[number] || false;
}

function setDependencies(d) {
  dependencies = d;

  for (var number in dependencies) {
    var parent = dependencies[number];
    parents[parent] = parents[parent] || [];
    parents[parent].push(number);
  }
}

function exit() {
  transmitter.unexport();
}

module.exports = {
  toggle: toggle,
  getState: getState,
  setDependencies: setDependencies,
  on: function (name, cb) {
    emitter.on(name, cb);
  },
  exit: exit
};
