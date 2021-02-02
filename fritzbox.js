const fetch = require('node-fetch')
const xml2js = require('xml2js')
const crypto = require('crypto')

class FritzBox {
  constructor (config) {
    this.config = config
  }

  async toggleWlan24 (toggle) {
    const settings = await this.getSettings()
    return this.applySettings({
      ssid: settings.data.wlanSettings.ssid,
      apActive: toggle ? 1 : 0
    })
  }

  async getSettings () {
    return this.querySettings()
  }

  applySettings (settings) {
    return this.querySettings({
      apply: 1,
      ...settings
    })
  }

  async querySettings (options) {
    await this.refreshSession()
    return this.query('/data.lua', {
      xhr: 1,
      page: 'wSet',
      sid: this.sid,
      ...options || {}
    })
  }

  async refreshSession () {
    var response = await this.query(`/login_sid.lua?sid=${this.sid}`)
    if (!this.setSidFromResponse(response)) {
      response = await this.createSession(response.SessionInfo.Challenge[0])
      if (!this.setSidFromResponse(response)) {
        console.log(response)
        throw new Error('Session creation with FritzBox failed.')
      }
    }
  }

  createSession (challenge) {
    const combination = Buffer.from(`${challenge}-${this.config.password}`, 'utf16le')
    const hash = crypto.createHash('md5').update(combination).digest('hex')
    const response = `${challenge}-${hash}`
    return this.query(`/login_sid.lua?username=${this.config.username}&response=${response}`)
  }

  query (path, data) {
    return fetch(`${this.config.host}${path}`, {
      method: data ? 'POST' : 'GET',
      body: data ? new URLSearchParams(data) : null,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })
      .then(async response => {
        if (response.headers.get('content-type') === 'text/xml') {
          const parser = new xml2js.Parser()
          const text = await response.text()
          return parser.parseStringPromise(text)
        }
        return response.json()
      })
  }

  setSidFromResponse (response) {
    this.sid = response.SessionInfo.SID[0]
    if (this.sid !== '0000000000000000') return true
  }
}

module.exports = FritzBox
