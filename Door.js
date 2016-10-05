'use strict';

var EventEmitter = require('events').EventEmitter;
var Gpio = require('onoff').Gpio;

var opener = new Gpio(24, 'high', 'none', { activeLow: true });
var bellListener = new Gpio(17, 'in', 'rising');
var bell = new Gpio(23, 'high', 'none', { activeLow: true });

var emitter = new EventEmitter();

function trigger(pin, duration, callback) {
  function emitEvent(value) {
    if (pin === opener) {
      emitter.emit('triggered', value);
    }
  }

  pin.writeSync(1);
  emitEvent(true);

  setTimeout(function () {
    pin.writeSync(0);
    emitEvent(false);
    if (callback) {
      callback();
    }
  }, duration);
}

function triggerOpener(duration, callback) {
  trigger(opener, duration || 3000, callback);
}

function triggerBell(duration, callback) {
  trigger(bell, duration || 500, callback);
}

function exit() {
  opener.unexport();
  bellListener.unexport();
  bell.unexport();
}

var bellTriggerThreshold = 100;
var bellLastRise;

function checkBell() {
  if (bellListener.readSync()) {
    if (!bellLastRise) {
      bellLastRise = Date.now();
    }

    setTimeout(checkBell, 20);

  } else if (bellLastRise) {
    var duration = Date.now() - bellLastRise;
    if (duration > bellTriggerThreshold) {
      emitter.emit('bellRang', duration);
    }

    bellLastRise = null;
  }
}

bellListener.watch(function (err, value) {
  if (err) {
    throw err;
  }

  if (!bellLastRise) {
    checkBell();
  }
});

module.exports = {
  triggerOpener: triggerOpener,
  triggerBell: triggerBell,
  on: function (name, cb) {
    emitter.on(name, cb);
  },
  exit: exit
};
