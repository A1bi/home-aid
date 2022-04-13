const HomeKit = require('hap-nodejs')
const HomeKitHMDevice = require('./HomeKitHMDevice')

const Service = HomeKit.Service
const Characteristic = HomeKit.Characteristic

class HomeKitHMSmokeDetector extends HomeKitHMDevice {
  constructor (accessory, device) {
    super(...arguments)

    this.applyMappings({
      STATE: {
        service: Service.SmokeSensor,
        characteristic: Characteristic.SmokeDetected,
        defaultValue: Characteristic.SmokeDetected.SMOKE_NOT_DETECTED,
        valueConversion: value => value ? Characteristic.SmokeDetected.DETECTED
          : Characteristic.SmokeDetected.SMOKE_NOT_DETECTED
      },
      LOWBAT: {
        service: Service.SmokeSensor,
        characteristic: Characteristic.StatusLowBattery,
        defaultValue: Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL
      }
    })

    this.hmDevice.on('update', (characteristic, value) => {
      if (characteristic === 'UNREACH') {
        const sd = this.accessory.getService(Service.SmokeSensor)
        sd.getCharacteristic(Characteristic.StatusActive)
          .updateValue(!value)
      }
    })
  }
}

module.exports = HomeKitHMSmokeDetector
