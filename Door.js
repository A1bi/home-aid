'use strict';

var EventEmitter = require('events').EventEmitter;
var Gpio = require('onoff').Gpio;
var spawn = require('child_process').spawn;
var fs = require('fs');

var opener = new Gpio(24, 'high', 'none', { activeLow: true });
var bellListener = new Gpio(17, 'in', 'both');
// var bell = new Gpio(23, 'high', 'none', { activeLow: true });
var soundEnable = new Gpio(23, 'high', 'none', { activeLow: true });

var active = false;
var activeExpiration;
var currentSound;

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
  // trigger(bell, duration || 500, callback);
}

spawn('amixer', ['set', 'PCM', '--', '85%']);

function playSound(path) {
  if (!fs.existsSync(path)) return;

  if (currentSound) {
    currentSound.removeAllListeners('exit');
    currentSound.kill('SIGTERM');
  } else {
    soundEnable.writeSync(1);
  }

  currentSound = spawn('aplay', [path]);
  currentSound.on('exit', function () {
    soundEnable.writeSync(0);
    currentSound = null;
  });
}

function exit() {
  opener.unexport();
  bellListener.unexport();
  // bell.unexport();
  soundEnable.unexport();
}

var bellTriggerThreshold = 100;
var bellTriggerTimer;
var bellLastRise;

function checkBell(val) {
  if (val) {
    bellLastRise = Date.now();

    bellTriggerTimer = setTimeout(function () {
      setActive();
      emitter.emit('bellDown');
    }, bellTriggerThreshold);

  } else {
    clearTimeout(bellTriggerTimer);
    bellLastRise = null;
  }
}

function setActive() {
   active = true;

   clearTimeout(activeExpiration);
   activeExpiration = setTimeout(function () {
     active = false;
   }, 30000);
}

bellListener.watch(function (err, value) {
  if (err) {
    throw err;
  }

  if (active) {
    setActive();

    if (value) {
      bellLastRise = Date.now();
      emitter.emit('bellDown');
    } else {
      var duration = Date.now() - bellLastRise;
      emitter.emit('bellUp', duration);
    }

  } else {
    checkBell(value);
  }
});

module.exports = {
  triggerOpener: triggerOpener,
  triggerBell: triggerBell,
  playSound: playSound,
  on: function (name, cb) {
    emitter.on(name, cb);
  },
  exit: exit
};
