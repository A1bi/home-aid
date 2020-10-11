'use strict';

var apn = require('apn');
var storage = require('node-persist');
var provider;

function init(credentials) {
  provider = new apn.Provider({
    token: {
      key: credentials.key,
      keyId: credentials.keyId,
      teamId: credentials.teamId
    },
    production: true
  });

  storage.init();
}

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
  init: init,
  send: send,
  registerDeviceToken: registerDeviceToken
};
