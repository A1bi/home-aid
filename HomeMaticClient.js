const EventEmitter = require('events').EventEmitter
const rpc = require('homematic-xmlrpc')
const HomeMaticDevice = require('./HomeMaticDevice')

const supportedDevices = ['CLIMATECONTROL_RT_TRANSCEIVER', 'HEATING_CLIMATECONTROL_TRANSCEIVER', 'SMOKE_DETECTOR']

class HomeMaticClient extends EventEmitter {
  constructor (host, port) {
    super()
    this.host = host
    this.port = port
    this.managedDevices = {}
  }

  init () {
    this.rpcServer = rpc.createServer({ host: 'localhost', port: 0 })
    this.rpcClient = rpc.createClient({ host: this.host, port: this.port })

    this.updateInterfaceClock()
    clearTimeout(this.updateInterfaceClockTimer)
    this.updateInterfaceClockTimer = setInterval(this.updateInterfaceClock, 3600000)

    this.registerEvents()
    this.subscribe()

    console.log(`Attached to HomeMatic RPC server at ${this.host}:${this.port}.`)
  }

  registerEvents () {
    this.rpcServer.on('system.listMethods', (err, params, callback) => {
      if (err) return console.log(err)

      callback(null, ['system.listMethods', 'system.multicall', 'event', 'listDevices'])
    })

    this.rpcServer.on('listDevices', (err, params, callback) => {
      if (err) return console.log(err)

      const list = Object.values(this.managedDevices).map(device => {
        return { ADDRESS: device.address, VERSION: device.version }
      })
      callback(null, list)
    })

    this.rpcServer.on('event', (err, params, callback) => {
      if (err) return console.log(err)

      const device = this.managedDevices[params[1]]
      if (device) device.applyUpdate(params[2], params[3])
      callback()
    })

    this.rpcServer.on('newDevices', (err, params, callback) => {
      if (err) return console.log(err)

      for (var newDevice of params[1]) {
        const isNew = Object.keys(this.managedDevices).indexOf(newDevice.ADDRESS) < 0
        if (isNew) this.createDevice(newDevice)
      }

      callback()
    })
  }

  createDevice (deviceInfo) {
    if (supportedDevices.indexOf(deviceInfo.TYPE) > -1) {
      const addr = deviceInfo.ADDRESS
      const device = this.managedDevices[addr] = new HomeMaticDevice(deviceInfo.TYPE, addr, deviceInfo.VERSION, this)
      this.emit('newDevice', device)
    }
  }

  methodCall (method, params, callback) {
    this.rpcClient.methodCall(method, params, (err, res) => {
      if (err) console.log(err)
      else if (callback) callback(err, res)
    })
  }

  updateInterfaceClock () {
    const timestamp = parseInt(Date.now() / 1000)
    const offset = new Date().getTimezoneOffset() * -1
    this.methodCall('setInterfaceClock', [timestamp, offset])
  }

  subscribe () {
    this.methodCall('init', [this.subscriptionUrl, 'foo'], (err, res) => {
      if (err) return console.log(err)

      console.log('Subscribed to HomeMatic events.')
      this.emit('ready')
    })
  }

  unsubscribe (callback) {
    this.methodCall('init', [this.subscriptionUrl, ''], (err, res) => {
      if (err) return console.log(err)

      console.log('Unsubscribed from HomeMatic events.')
      if (callback) callback()
    })
  }

  togglePairing (toggle, seconds) {
    toggle = !!toggle
    seconds = seconds || 60
    this.methodCall('setInstallMode', [toggle, seconds, 1], (err, res) => {
      if (!err) {
        console.log(`${toggle ? 'Enabled' : 'Disabled'} pairing for ${seconds} seconds.`)
      }
    })
  }

  exit (callback) {
    clearTimeout(this.updateInterfaceClockTimer)
    this.unsubscribe(callback)
  }

  get subscriptionUrl () {
    return `xmlrpc://${this.rpcServer.host}:${this.rpcServer.server.address().port}`
  }
}

module.exports = HomeMaticClient
