const HomeKit = require('hap-nodejs')
const Door = require('./Door')
const Outlets = require('./Outlets')
const HomeMatic = require('./HomeMatic')
const HomeKitHMThermostat = require('./HomeKitHMThermostat')
const HomeKitHMIPThermostat = require('./HomeKitHMIPThermostat')
const HomeKitHMSmokeDetector = require('./HomeKitHMSmokeDetector')

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
        .addService(HomeKit.Service.Outlet, name, i)
        .updateCharacteristic(HomeKit.Characteristic.OutletInUse, true)
        .getCharacteristic(HomeKit.Characteristic.On)
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

    const doorOpener = door.addService(HomeKit.Service.LockMechanism, 'Opener')
    doorOpener
      .getCharacteristic(HomeKit.Characteristic.LockTargetState)
      .on('set', (value, callback) => {
        if (_cb) _cb()
        Door.triggerOpener()
        callback()
      })
      .on('get', callback => {
        callback(null, HomeKit.Characteristic.LockTargetState.SECURED)
      })
    doorOpener
      .getCharacteristic(HomeKit.Characteristic.LockCurrentState)
      .on('get', callback => {
        callback(null, HomeKit.Characteristic.LockCurrentState.SECURED)
      })

    Door.on('triggered', state => {
      var value = state ? HomeKit.Characteristic.LockCurrentState.UNSECURED : HomeKit.Characteristic.LockCurrentState.SECURED
      doorOpener.updateCharacteristic(HomeKit.Characteristic.LockCurrentState, value)
      value = state ? HomeKit.Characteristic.LockTargetState.UNSECURED : HomeKit.Characteristic.LockTargetState.SECURED
      doorOpener.updateCharacteristic(HomeKit.Characteristic.LockTargetState, value)
    })

    this.addAccessory(door)
  }

  addHomeMatic (config, callback) {
    HomeMatic.on('newDevice', device => {
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
      if (paired) {
        HomeMatic.togglePairing(true)
      }
      callback()
    })

    HomeMatic.on('ready', callback)
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
      .getService(HomeKit.Service.AccessoryInformation)
      .setCharacteristic(HomeKit.Characteristic.Manufacturer, 'Foo GmbH')
      .setCharacteristic(HomeKit.Characteristic.Model, 'Eins')
      .setCharacteristic(HomeKit.Characteristic.SerialNumber, '12345678')
    return accessory
  }

  addAccessory (accessory) {
    accessory.bridged = true
    this.bridge.addBridgedAccessory(accessory)
  }
}

module.exports = HomeKitServer
