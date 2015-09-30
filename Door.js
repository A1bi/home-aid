'use strict';

var EventEmitter = require('events').EventEmitter;
var Gpio = require('onoff').Gpio;

var opener = new Gpio(4, 'out');
var bellListener = new Gpio(17, 'in', 'rising');
var bell = new Gpio(27, 'out');

var emitter = new EventEmitter();

function trigger(pin, duration, callback) {
  pin.writeSync(1);

  setTimeout(function () {
    pin.writeSync(0);
    if (callback) {
      callback();
    }
  }, duration);
}

function triggerOpener(duration, callback) {
  trigger(opener, duration || 2000, callback);
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
