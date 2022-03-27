const HomeKitHMThermostat = require('./HomeKitHMThermostat')

class HomeKitHMIPThermostat extends HomeKitHMThermostat {
  static batteryStateAvailable = false
  static targetTemperatureDatapoint = 'SET_POINT_TEMPERATURE'
  static valveStateDatapoint = 'LEVEL'
  static valveStateDivisor = 1
}

module.exports = HomeKitHMIPThermostat
