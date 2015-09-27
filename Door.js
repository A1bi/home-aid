'use strict';

var EventEmitter = require('events').EventEmitter;
var Gpio = require('onoff').Gpio;

var opener = new Gpio(4, 'out');
var bellListener = new Gpio(17, 'in', 'both');
var bell = new Gpio(27, 'out');

var emitter = new EventEmitter();

var ignoreBell = false;

bell._writeSync = bell.writeSync;
bell.writeSync = function (value) {
  if (value) {
    ignoreBell = true;
  } else {
    setTimeout(function () {
      ignoreBell = false;
    }, 50);
  }
  this._writeSync(value);
};

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

bellListener.watch(function (err, value) {
  if (err) {
    throw err;
  }

  if (ignoreBell) {
   return;
  }

  if (bellLastRise) {
    if (Date.now() - bellLastRise > bellTriggerThreshold) {
      emitter.emit('bellRang');
    }
    bellLastRise = null;
  } else {
    bellLastRise = Date.now();
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
