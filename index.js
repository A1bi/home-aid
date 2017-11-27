'use strict';

var Door = require('./Door');
var Outlets = require('./Outlets');
var HomeMatic = require('./HomeMatic');
var HomeKitServer = require('./HomeKitServer');
var BellPatternRecognizer = require('./BellPatternRecognizer');

var hkPin = process.argv[2];
if (!hkPin) {
  console.log('You have to specify a PIN for HomeKit.')
  process.exit(1);
}
var numberOfOutlets = 6;
var pattern = [1, 1, 1, 1.8, 1.8, 1, 1];

HomeMatic.init();

Outlets.setDependencies({
  3: 1,
  4: 1,
  5: 1
});

var hkServer = new HomeKitServer();
hkServer.addOutlets(numberOfOutlets);
hkServer.addDoor(function () {
  killBellIndicator();
});
hkServer.addHomeMatic(function () {
  hkServer.publish(hkPin);
});

Door.on('bellRang', function () {
  // Door.playSound('sounds/comedy3.wav');
  console.log('doorbell pushed', new Date());
});

var bellIndicatorTimer;
function bellIndicator(toggle) {
  Outlets.toggle(6, toggle);
  clearTimeout(bellIndicatorTimer);
  bellIndicatorTimer = setTimeout(function () {
   bellIndicator(!toggle);
  }, 500);
}

function killBellIndicator() {
  bellIndicator(false);
  clearTimeout(bellIndicatorTimer);
  console.log('bell indicator killed');
}

var recognizer = new BellPatternRecognizer();
recognizer.addPattern(pattern, function () {
  Door.triggerOpener();
  console.log('bell pattern recognized, opening door');
});
recognizer.on('bellRang', function () {
  console.log('no bell pattern recognized, triggering regular bell');
//  triggerBell(2);
  bellIndicator(true);
  console.log('bell indicator started');
  setTimeout(function () {
    killBellIndicator();
  }, 20000);
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
