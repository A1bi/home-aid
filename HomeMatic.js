'use strict';

var EventEmitter = require('events').EventEmitter;
var rpc = require('binrpc');

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

var deviceMappings = {
  'CLIMATECONTROL_RT_TRANSCEIVER': HomeMaticDevice.types.Thermostat
};
var devices = {};

var emitter = new EventEmitter();


function registerEvents() {
  rpcServer.on('system.listMethods', function (err, params, callback) {
    callback(['system.listMethods', 'system.multicall', 'event']);
  });

  // rpcServer.on('listDevices', function (err, params, callback) {
  //   callback([]);
  // });

  rpcServer.on('event', function (err, params, callback) {
    var device = devices[params[1]];
    if (device) {
      device.applyUpdate(params[2], params[3]);
    }
    callback();
  });

  rpcServer.on('newDevices', function (err, params, callback) {
    var newDevices = params[1];
    newDevices.forEach(function (newDevice) {
      var deviceType = deviceMappings[newDevice.TYPE];
      if (deviceType) {
        var device = devices[newDevice.ADDRESS] = new HomeMaticDevice(deviceType, newDevice.ADDRESS, methodCall);
        emitter.emit('newDevice', device);
      }
    });
    callback(null);
  });

  rpcClient.on('connect', function () {
    console.log('Connected to HomeMatic RFD RPC server.');
    subscribe();
  });

  // function addDevice() {
  //   rpcClient.methodCall('setInstallMode', [true, 60], function (err, res) {
  //     console.log(err, res);
  //   });
  // }
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

function subscribe() {
  methodCall('init', [subscriptionUrl, 'foo'], function (err, res) {
    console.log('Subscribed to HomeMatic events.');
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

function init() {
  if (!rpcServer && !rpcClient) {
    rpcServer = rpc.createServer(hosts.self);
    rpcClient = rpc.createClient(hosts.rfd);
    registerEvents();
  }
}

function exit(callback) {
  unsubscribe(callback);
}

module.exports = {
  init: init,
  exit: exit,
  devices: devices,
  on: function (name, cb) {
    emitter.on(name, cb);
  }
};
