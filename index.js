'use strict';

var Door = require('./Door');
var Outlets = require('./Outlets');
var HomeMatic = require('./HomeMatic');
var HomeKitServer = require('./HomeKitServer');
var BellPatternRecognizer = require('./BellPatternRecognizer');

var hkPin = '031-45-154';
var numberOfOutlets = 3;
var pattern = [1, 1, 1, 1.8, 1.8, 1, 1];

HomeMatic.init();

var hkServer = new HomeKitServer();
hkServer.addOutlets(numberOfOutlets);
hkServer.addDoor();
hkServer.addHomeMatic(function () {
  hkServer.publish(hkPin);
});

var recognizer = new BellPatternRecognizer();
recognizer.addPattern(pattern, function () {
  Door.triggerOpener();
});
recognizer.on('bellRang', function () {
  triggerBell(2);
});

Door.on('bellRang', function () {
  console.log(new Date());
});

var triggerBell = function (remaining) {
  Door.triggerBell(150, function () {
    if (remaining > 0) {
      setTimeout(function () {
        triggerBell(remaining-1);
      }, 150);
    }
  });
};

var exited = false;
function exit(options) {
  if (!exited) {
    Door.exit();
    Outlets.exit();
    HomeMatic.exit();
    exited = true;
  }

  console.log('Exiting');
  if (options && options.exit) {
    process.exit();
  }
}

process.on('exit', exit);
process.on('SIGINT', exit.bind(null, { exit: true }));
