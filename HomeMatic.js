const EventEmitter = require('events').EventEmitter
const rpc = require('binrpc')
const HomeMaticDevice = require('./HomeMaticDevice')

const hosts = {
  self: {
    host: 'localhost',
    port: 2002
  },
  rfd: {
    host: 'localhost',
    port: 2001
  }
}

var rpcServer, rpcClient
const subscriptionUrl = `xmlrpc_bin://${hosts.self.host}:${hosts.self.port}`

const supportedDevices = ['CLIMATECONTROL_RT_TRANSCEIVER', 'SMOKE_DETECTOR']
const managedDevices = {}

var updateInterfaceClockTimer
const emitter = new EventEmitter()

function registerEvents () {
  rpcServer.on('system.listMethods', (err, params, callback) => {
    if (err) return console.log(err)

    callback(null, ['system.listMethods', 'system.multicall', 'event', 'listDevices'])
  })

  rpcServer.on('listDevices', (err, params, callback) => {
    if (err) return console.log(err)

    const list = Object.values(managedDevices).map(device => {
      return { ADDRESS: device.address, VERSION: device.version }
    })
    callback(null, list)
  })

  rpcServer.on('event', (err, params, callback) => {
    if (err) return console.log(err)

    const device = managedDevices[params[1]]
    if (device) device.applyUpdate(params[2], params[3])
    callback()
  })

  rpcServer.on('newDevices', (err, params, callback) => {
    if (err) return console.log(err)

    for (var newDevice of params[1]) {
      const isNew = Object.keys(managedDevices).indexOf(newDevice.ADDRESS) < 0
      if (isNew) createDevice(newDevice)
    }

    callback()
  })

  rpcClient.on('connect', () => {
    console.log('Connected to HomeMatic RFD RPC server.')

    updateInterfaceClock()
    clearTimeout(updateInterfaceClockTimer)
    updateInterfaceClockTimer = setInterval(updateInterfaceClock, 3600000)

    subscribe()
  })
}

function createDevice (deviceInfo) {
  if (supportedDevices.indexOf(deviceInfo.TYPE) > -1) {
    const addr = deviceInfo.ADDRESS
    const device = managedDevices[addr] = new HomeMaticDevice(deviceInfo.TYPE, addr, deviceInfo.VERSION, methodCall)
    emitter.emit('newDevice', device)
  }
}

function methodCall (method, params, callback) {
  rpcClient.methodCall(method, params, (err, res) => {
    if (err) console.log(err)
    else if (callback) callback(err, res)
  })
}

function updateInterfaceClock () {
  const timestamp = parseInt(Date.now() / 1000)
  const offset = new Date().getTimezoneOffset() * -1
  methodCall('setInterfaceClock', [timestamp, offset])
}

function subscribe () {
  methodCall('init', [subscriptionUrl, 'foo'], (err, res) => {
    if (err) return console.log(err)

    console.log('Subscribed to HomeMatic events.')
    emitter.emit('ready')
  })
}

function unsubscribe (callback) {
  methodCall('init', [subscriptionUrl, ''], (err, res) => {
    if (err) return console.log(err)

    console.log('Unsubscribed from HomeMatic events.')
    if (callback) callback()
  })
}

function togglePairing (toggle, seconds) {
  toggle = !!toggle
  seconds = seconds || 60
  methodCall('setInstallMode', [toggle, seconds, 1], (err, res) => {
    if (!err) {
      console.log(`${toggle ? 'Enabled' : 'Disabled'} pairing for ${seconds} seconds.`)
    }
  })
}

function init () {
  if (!rpcServer && !rpcClient) {
    rpcServer = rpc.createServer(hosts.self)
    rpcClient = rpc.createClient(hosts.rfd)
    registerEvents()
  }
}

function exit (callback) {
  clearTimeout(updateInterfaceClockTimer)
  unsubscribe(callback)
}

module.exports = {
  init: init,
  exit: exit,
  togglePairing: togglePairing,
  on: (name, cb) => emitter.on(name, cb)
}
