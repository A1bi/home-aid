const HomeKitHMThermostat = require('./HomeKitHMThermostat')

class HomeKitHMIPThermostat extends HomeKitHMThermostat {
  static batteryStateAvailable = false
  static targetTemperatureDatapoint = 'SET_POINT_TEMPERATURE'
  static valveStateDatapoint = 'LEVEL'
  static valveStateDivisor = 1

  constructor (accessory, device, valveOpenThreshold) {
    super(...arguments)

    this.enableManualMode(() => {})
  }

  enableManualMode (callback) {
    this.hmDevice.setValue('CONTROL_MODE', 1, () => {
      this.hmDevice.setValue('BOOST_MODE', false, () => callback())
    })
  }
}

module.exports = HomeKitHMIPThermostat
