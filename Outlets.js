'use strict';

var Gpio = require('onoff').Gpio;
var sleep = require('sleep');

var transmitter = new Gpio(22, 'out');

var states = [];

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

function toggle(number, toggle) {
  toggle = !!toggle;

  if (getState(number) === toggle) {
    return;
  }
  states[number] = toggle;

  for (var i = 0; i < 6; i++) {
    sendValue(0x19, 5);

    sendValue(number, 5);

    sendBit(toggle);
    sendBit(!toggle);

    sendSync();
  }
}

function getState(number) {
  return states[number] || false;
}

function exit() {
  transmitter.unexport();
}

module.exports = {
  toggle: toggle,
  getState: getState,
  exit: exit
};
