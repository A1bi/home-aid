const HomeKit = require('hap-nodejs')
const HomeKitHMDevice = require('./HomeKitHMDevice')

class HomeKitHMSmokeDetector extends HomeKitHMDevice {
  constructor (accessory, device) {
    super(...arguments)

    this.applyMappings({
      STATE: {
        service: HomeKit.Service.SmokeSensor,
        characteristic: HomeKit.Characteristic.SmokeDetected,
        defaultValue: 0,
        valueConversion: value => value ? 1 : 0
      },
      LOWBAT: {
        service: HomeKit.Service.SmokeSensor,
        characteristic: HomeKit.Characteristic.StatusLowBattery,
        defaultValue: 0
      }
    })

    this.hmDevice.on('update', (characteristic, value) => {
      if (characteristic === 'UNREACH') {
        const sd = this.accessory.getService(HomeKit.Service.SmokeSensor)
        sd.getCharacteristic(HomeKit.Characteristic.StatusActive)
          .updateValue(!value)
      }
    })
  }
}

module.exports = HomeKitHMSmokeDetector
