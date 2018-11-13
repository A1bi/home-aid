'use strict';

var EventEmitter = require('events').EventEmitter;
var Gpio = require('onoff').Gpio;

var activeSwitch = new Gpio(25, 'high', 'none', { activeLow: true });

var state = false;

var emitter = new EventEmitter();

function setActive(active) {
  active = !!active;
  if (active !== state) {
    state = active;
    activeSwitch.writeSync(state ? 1 : 0);
    emitter.emit('activeStateChanged', state);
  }
}

function getActiveState() {
  return state;
}

function exit() {
  activeSwitch.unexport();
}

module.exports = {
  setActive: setActive,
  getActiveState: getActiveState,
  on: function (name, cb) {
    emitter.on(name, cb);
  },
  exit: exit
};
