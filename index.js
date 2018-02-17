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

//var recognizer = new BellPatternRecognizer();
//recognizer.addPattern(pattern, function () {
//  Door.triggerOpener();
//  console.log('bell pattern recognized, opening door');
//});

var entryMode = false;
var entryTimer, entryFailTimer;
Door.on('bellDown', function () {
  if (entryMode) {
    bellsCounted++;
    Door.playSound('sounds/input.wav');

  } else {
    clearTimeout(entryTimer);
    entryTimer = setTimeout(function () {
      console.log('entry mode enabled');
      entryMode = true;
      bellsCounted = 0;
      Door.playSound('sounds/entry_mode_enabled.wav');

      entryFailTimer = setTimeout(function () {
        console.log('entry timeout');
        entryMode = false;
        Door.playSound('sounds/fail.wav');
      }, 10000);
    }, 3000);
  }
});

var bellsCounted;
Door.on('bellUp', function () {
  if (entryMode) {
    if (bellsCounted === 4) {
      console.log('entry successful, opening door');
      entryMode = false;
      clearTimeout(entryFailTimer);
      Door.triggerOpener();
      // Door.playSound('sounds/unlocked.wav');
    }

  } else {
    console.log('no bell pattern recognized, triggering regular bell', new Date());
    clearTimeout(entryTimer);
//    triggerBell(2);
    bellIndicator(true);
    console.log('bell indicator started');
    setTimeout(function () {
      killBellIndicator();
    }, 20000);
  }
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
