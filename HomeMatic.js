'use strict';

var EventEmitter = require('events').EventEmitter;
var rpc = require('binrpc');
var storage = require('node-persist');

var HomeMaticDevice = require('./HomeMaticDevice');

var hosts = {
  self: {
    host: 'localhost',
    port: 2002
  },
  rfd: {
    host: 'localhost',
    port: 2001
  }
};

var rpcServer, rpcClient;
var subscriptionUrl = 'xmlrpc_bin://' + hosts.self.host + ':' + hosts.self.port;

var supportedDevices = ['CLIMATECONTROL_RT_TRANSCEIVER', 'SMOKE_DETECTOR'];
var managedDevices = {};

var updateInterfaceClockTimer;
var emitter = new EventEmitter();


function registerEvents() {
  rpcServer.on('system.listMethods', function (err, params, callback) {
    callback(null, ['system.listMethods', 'system.multicall', 'event', 'listDevices']);
  });

  rpcServer.on('listDevices', function (err, params, callback) {
    storage.getItem('devices').then(function (devices) {
      var list = (devices || []).map(function (device) {
        return { ADDRESS: device.ADDRESS, VERSION: device.VERSION };
      });
      callback(null, list);
    });
  });

  rpcServer.on('event', function (err, params, callback) {
    var addr = getParentAddress(params[1]);
    var device = managedDevices[addr];
    if (device) {
      device.applyUpdate(params[2], params[3]);
    }
    callback();
  });

  rpcServer.on('newDevices', function (err, params, callback) {
    var newDevices = params[1];

    storage.getItem('devices')
      .then(function (oldDevices) {
        newDevices.forEach(function (newDevice) {
          var isNew = oldDevices.every(function (oldDevice, index) {
            if (oldDevice.ADDRESS === newDevice.ADDRESS) {
              Object.assign(oldDevices[index], newDevice);
              return false;
            }
            return true;
          });

          if (isNew) {
            oldDevices.push(newDevice);
            addDevices([newDevice]);
          }
        });

        return storage.setItem('devices', oldDevices);
      })
      .then(function () {
        storage.persist();
      })
    ;

    callback();
  });

  rpcClient.on('connect', function () {
    console.log('Connected to HomeMatic RFD RPC server.');

    updateInterfaceClock();
    clearTimeout(updateInterfaceClockTimer);
    updateInterfaceClockTimer = setInterval(updateInterfaceClock, 3600000);

    subscribe();
  });
}

function addDevices(devices) {
  devices.forEach(function (deviceInfo) {
    if (supportedDevices.indexOf(deviceInfo.TYPE) > -1) {
      var addr = getParentAddress(deviceInfo.ADDRESS);
      var newDevice = managedDevices[addr] = new HomeMaticDevice(deviceInfo.TYPE, deviceInfo.ADDRESS, methodCall);
      emitter.emit('newDevice', newDevice);
    }
  });
}

function methodCall(method, params, callback) {
  rpcClient.methodCall(method, params, function (err, res) {
    if (err) {
      console.log(err);
    }

    if (callback) {
      callback(err, res);
    }
  });
}

function updateInterfaceClock() {
  var timestamp = parseInt(Date.now() / 1000);
  var offset = new Date().getTimezoneOffset() * -1;
  methodCall('setInterfaceClock', [timestamp, offset]);
}

function subscribe() {
  methodCall('init', [subscriptionUrl, 'foo'], function (err, res) {
    console.log('Subscribed to HomeMatic events.');

    storage.getItem('devices').then(function (devices) {
      addDevices(devices);
      emitter.emit('ready');
    });
  });
}

function unsubscribe(callback) {
  methodCall('init', [subscriptionUrl, ''], function (err, res) {
    console.log('Unsubscribed from HomeMatic events.');
    if (callback) {
      callback();
    }
  });
}

function togglePairing(toggle, seconds) {
  toggle = !!toggle;
  seconds = seconds || 60;
  methodCall('setInstallMode', [toggle, seconds, 1], function (err, res) {
    if (!err) {
      console.log((toggle ? 'Enabled' : 'Disabled') + ' pairing for ' + seconds + ' seconds.');
    }
  });
}

function getParentAddress(address) {
  return address.split(':')[0];
}

function init() {
  storage.init();

  if (!rpcServer && !rpcClient) {
    rpcServer = rpc.createServer(hosts.self);
    rpcClient = rpc.createClient(hosts.rfd);
    registerEvents();
  }
}

function exit(callback) {
  clearTimeout(updateInterfaceClockTimer);
  unsubscribe(callback);
}

module.exports = {
  init: init,
  exit: exit,
  togglePairing: togglePairing,
  on: function (name, cb) {
    emitter.on(name, cb);
  }
};
