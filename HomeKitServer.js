const HomeKit = require('hap-nodejs')
const Door = require('./Door')
const Outlets = require('./Outlets')
const HomeKitHMThermostat = require('./HomeKitHMThermostat')
const HomeKitHMIPThermostat = require('./HomeKitHMIPThermostat')
const HomeKitHMSmokeDetector = require('./HomeKitHMSmokeDetector')

const Service = HomeKit.Service
const Characteristic = HomeKit.Characteristic

const deviceMapping = {
  CLIMATECONTROL_RT_TRANSCEIVER: HomeKitHMThermostat,
  HEATING_CLIMATECONTROL_TRANSCEIVER: HomeKitHMIPThermostat,
  SMOKE_DETECTOR: HomeKitHMSmokeDetector
}

class HomeKitServer {
  constructor () {
    this.bridge = new HomeKit.Bridge('Home Aid Bridge', HomeKit.uuid.generate('Home Aid Bridge'))
  }

  addOutlets (numberOfOutlets) {
    for (var i = 1; i <= numberOfOutlets; i++) {
      const name = `Outlet ${i}`
      const outlet = this.createAccessory(name)
      outlet
        .addService(Service.Outlet, name, i)
        .updateCharacteristic(Characteristic.OutletInUse, true)
        .getCharacteristic(Characteristic.On)
        .on('set', (value, callback) => {
          Outlets.toggle(i, value)
          callback()
        })
        .on('get', callback => {
          callback(null, Outlets.getState(i))
        })

      this.addAccessory(outlet)
    }
  }

  addDoor (_cb) {
    const door = this.createAccessory('Door')

    const doorOpener = door.addService(Service.LockMechanism, 'Opener')
    doorOpener
      .getCharacteristic(Characteristic.LockTargetState)
      .on('set', (value, callback) => {
        if (_cb) _cb()
        Door.triggerOpener()
        callback()
      })
      .on('get', callback => {
        callback(null, Characteristic.LockTargetState.SECURED)
      })
    doorOpener
      .getCharacteristic(Characteristic.LockCurrentState)
      .on('get', callback => {
        callback(null, Characteristic.LockCurrentState.SECURED)
      })

    Door.on('triggered', state => {
      var value = state ? Characteristic.LockCurrentState.UNSECURED : Characteristic.LockCurrentState.SECURED
      doorOpener.updateCharacteristic(Characteristic.LockCurrentState, value)
      value = state ? Characteristic.LockTargetState.UNSECURED : Characteristic.LockTargetState.SECURED
      doorOpener.updateCharacteristic(Characteristic.LockTargetState, value)
    })

    this.addAccessory(door)
  }

  addHomeMatic (client, config) {
    client.on('newDevice', device => {
      const accessory = this.createAccessory(device.address)
      const deviceClass = deviceMapping[device.type]
      var options
      if (deviceClass === HomeKitHMThermostat) {
        options = config.thermostatValveOpenThreshold
      }
      // eslint-disable-next-line no-new, new-cap
      new deviceClass(accessory, device, options)
      this.addAccessory(accessory)
    })

    this.bridge.on('identify', (paired, callback) => {
      if (paired) client.togglePairing(true)
      callback()
    })
  }

  publish (pin) {
    this.bridge.publish({
      username: 'CC:22:3D:E3:CE:F6',
      port: 51826,
      pincode: pin,
      category: HomeKit.Accessory.Categories.OTHER,
      advertiser: 'avahi'
    })
  }

  createAccessory (name) {
    const uuid = HomeKit.uuid.generate(`home-aid:accessories:${name}`)
    const accessory = new HomeKit.Accessory(name, uuid)
    accessory
      .getService(Service.AccessoryInformation)
      .setCharacteristic(Characteristic.Manufacturer, 'Foo GmbH')
      .setCharacteristic(Characteristic.Model, 'Eins')
      .setCharacteristic(Characteristic.SerialNumber, '12345678')
    return accessory
  }

  addAccessory (accessory) {
    accessory.bridged = true
    this.bridge.addBridgedAccessory(accessory)
  }
}

module.exports = HomeKitServer
