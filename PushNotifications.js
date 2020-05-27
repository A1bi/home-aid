'use strict';

var fs = require('fs');
var apn = require('apn');
var storage = require('node-persist');

try {
  var credentials = JSON.parse(fs.readFileSync('apns.json'));
} catch (e) {
  console.log('apns.json is missing or invalid.');
  process.exit(1);
}

var provider = new apn.Provider({
  token: {
    key: credentials.key.join('\n'),
    keyId: credentials.keyId,
    teamId: credentials.teamId
  },
  production: true
});

storage.init();

function send(aps, payload) {
  payload = payload || {};
  payload['aps'] = aps;

  var notification = new apn.Notification();
  notification.rawPayload = payload;
  notification.topic = credentials.topic;

  getAllDeviceTokens().then(function (tokens) {
    provider.send(notification, tokens);
  });
}

function registerDeviceToken(token) {
  getAllDeviceTokens().then(function (tokens) {
    if (tokens.indexOf(token) === -1) {
      tokens.push(token);
      storage.setItem('pushDeviceTokens', tokens);
    }
    console.log(tokens);
  });
}

function getAllDeviceTokens() {
  return storage.getItem('pushDeviceTokens').then(function (tokens) {
    return tokens || [];
  });
}

module.exports = {
  send: send,
  registerDeviceToken: registerDeviceToken
};
