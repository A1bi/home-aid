'use strict';

var Door = require('./Door');
var Outlets = require('./Outlets');
var HomeKitServer = require('./HomeKitServer');
var BellPatternRecognizer = require('./BellPatternRecognizer');

var hkPin = '031-45-154';
var numberOfOutlets = 3;
var pattern = [1, 1, 1, 1.8, 1.8, 1, 1];

var hkServer = new HomeKitServer();
hkServer.addOutlets(numberOfOutlets);
hkServer.addDoor();
hkServer.publish(hkPin);

var recognizer = new BellPatternRecognizer();
recognizer.addPattern(pattern, function () {
  Door.triggerOpener();
});
recognizer.on('bellRang', function () {
  triggerBell(5);
});

Door.on('bellRang', function () {
  console.log(new Date());
});

var triggerBell = function (remaining) {
  Door.triggerBell(10, function () {
    if (remaining > 0) {
      setTimeout(function () {
        triggerBell(remaining-1);
      }, 10);
    }
  });
};

function exit() {
  Door.exit();
  Outlets.exit();

  console.log('Exiting');
}

process.on('exit', exit);
