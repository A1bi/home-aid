'use strict';

var Door = require('./Door');
var Outlets = require('./Outlets');
var Heater = require('./Heater');
var HomeMatic = require('./HomeMatic');
var HomeKitServer = require('./HomeKitServer');
var config = require('./config');
var BellPatternRecognizer = require('./BellPatternRecognizer');
var PushNotifications = require('./PushNotifications');
var http = require('http');
var fs = require('fs');

HomeMatic.init();

PushNotifications.init(config.apns);

Outlets.setDependencies(config.outlets.dependencies);

var hkServer = new HomeKitServer();
hkServer.addOutlets(config.outlets.count);
hkServer.addDoor(function () {
  killBellIndicator();
});
hkServer.addHomeMatic(function () {
  hkServer.publish(config.homeKit.pin);
});
hkServer.addHeater();

var bellIndicatorTimer;
function bellIndicator(toggle) {
  Outlets.toggle(6, toggle);
  clearTimeout(bellIndicatorTimer);
  bellIndicatorTimer = setTimeout(function () {
   bellIndicator(!toggle);
  }, 500);
}

function killBellIndicator() {
  if (!bellIndicatorTimer) return;
  bellIndicator(false);
  clearTimeout(bellIndicatorTimer);
  bellIndicatorTimer = null;
  console.log('bell indicator killed');
}

// var pattern = [1, 1, 1, 1.8, 1.8, 1, 1];
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
      Door.triggerOpener(null, function () {
        Door.playSound('sounds/success.wav');
      });
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

    PushNotifications.send({
      alert: {
        'title-loc-key': 'notifications.bellRang.title',
        'loc-key': 'notifications.bellRang.body'
      },
      sound: 'door_bell.aif',
      category: 'bellRang'
    });
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
    Heater.exit();
    HomeMatic.exit();
    exited = true;
  }

  console.log('Exiting');
  if (options && options.exit) {
    process.exit();
  }
}

var sockPath = '/tmp/home-aid.sock';
fs.unlinkSync(sockPath);

var server = http.createServer(function (request, response) {
  var status = 404;
  var message = 'Unknown action';
  var body = '';

  request.on('data', function (chunk) {
    body += chunk.toString();
  });

  request.on('end', function () {
    if (request.headers['x-auth'] !== config.api.authToken) {
      status = 401;
      message = 'Invalid auth token';

    } else if (request.method === 'POST') {
      if (request.url === '/open-door') {
        Door.triggerOpener();
        status = 200;
        message = 'Door opened';

      } else if (request.url === '/push-device-tokens') {
        try {
          var data = JSON.parse(body);
          if (data.token) {
            PushNotifications.registerDeviceToken(data.token);
          }
          status = 201;
          message = 'Token registered';
        } catch (e) {
          console.log(e);
          status = 400;
          message = 'Invalid request';
        }
      }
    }

    response.writeHead(status, {'Content-Type': 'text/plain'});
    response.write(message + '\n');
    response.end();

    console.log('got web request, responded with: "' + message  + '"', new Date());
  });

}).listen(sockPath);

fs.chmodSync(sockPath, 666);

process.on('exit', exit);
process.on('SIGINT', exit.bind(null, { exit: true }));
