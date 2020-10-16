const apn = require('apn')
const storage = require('node-persist')

class PushNotificationsService {
  constructor (credentials) {
    this.provider = new apn.Provider({
      token: credentials,
      production: true
    })

    this.topic = credentials.topic

    storage.init()
  }

  sendNotification (aps, payload = {}) {
    payload.aps = aps

    const notification = new apn.Notification()
    notification.rawPayload = payload
    notification.topic = this.topic

    this.deviceTokens.then(tokens => {
      this.provider.send(notification, tokens)
    })
  }

  registerDeviceToken (token) {
    this.deviceTokens.then(tokens => {
      if (tokens.indexOf(token) > -1) return

      tokens.push(token)
      storage.setItem('pushDeviceTokens', tokens)
    })
  }

  get deviceTokens () {
    return storage.getItem('pushDeviceTokens').then(tokens => tokens || [])
  }
}

module.exports = PushNotificationsService
