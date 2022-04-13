const HomeKit = require('hap-nodejs')
const HomeKitHMDevice = require('./HomeKitHMDevice')

const Service = HomeKit.Service
const Characteristic = HomeKit.Characteristic

class HomeKitHMThermostat extends HomeKitHMDevice {
  static batteryStateAvailable = true
  static targetTemperatureDatapoint = 'SET_TEMPERATURE'
  static valveStateDatapoint = 'VALVE_STATE'
  static valveStateDivisor = 100

  constructor (accessory, device, valveOpenThreshold) {
    super(...arguments)

    this.active = false
    this.valveOpenThreshold = valveOpenThreshold

    const mappings = {
      ACTUAL_TEMPERATURE: {
        service: Service.Thermostat,
        characteristic: Characteristic.CurrentTemperature,
        defaultValue: 10
      }
    }

    mappings[this.constructor.targetTemperatureDatapoint] = {
      service: Service.Thermostat,
      characteristic: Characteristic.TargetTemperature,
      defaultValue: 10
    }

    if (this.constructor.batteryStateAvailable) {
      mappings.BATTERY_STATE = {
        service: Service.BatteryService,
        characteristic: Characteristic.BatteryLevel,
        defaultValue: 100,
        valueConversion: value => parseInt((value - 1.5) / 3.1 * 100)
      }
    }

    this.applyMappings(mappings)

    this.hmDevice
      .on('ready', () => {
        this.thermostat.getCharacteristic(Characteristic.CurrentHeatingCoolingState)
          .on('get', callback => callback(null, this.active ? Characteristic.CurrentHeatingCoolingState.HEAT
            : Characteristic.CurrentHeatingCoolingState.OFF))

        this.thermostat.getCharacteristic(Characteristic.TargetHeatingCoolingState)
          .on('set', (value, callback) => this.setTargetHeatingCoolingState(value, callback))
          .updateValue(Characteristic.TargetHeatingCoolingState.AUTO)
      })

      .on('update', (characteristic, value) => {
        if (characteristic !== this.constructor.valveStateDatapoint) return

        this.updateCurrentHeatingCoolingState(value)
      })
  }

  setTargetHeatingCoolingState (state, callback) {
    if (state === Characteristic.TargetHeatingCoolingState.HEAT) {
      this.enableBoostMode(callback)
    } else if (state === Characteristic.TargetHeatingCoolingState.AUTO) {
      this.enableManualMode(callback)
    } else {
      callback()
    }
  }

  updateCurrentHeatingCoolingState (value) {
    const active = (value / this.constructor.valveStateDivisor) >= this.valveOpenThreshold
    if (active === this.active) return

    this.active = active
    this.thermostat.getCharacteristic(Characteristic.CurrentHeatingCoolingState)
      .updateValue(active ? Characteristic.CurrentHeatingCoolingState.HEAT
        : Characteristic.CurrentHeatingCoolingState.OFF)
  }

  enableManualMode (callback) {
    if (this.hmDevice.getValue('CONTROL_MODE') === 1) return callback()

    const temperature = this.temperatureBeforeBoost || 19
    this.hmDevice.setValue('MANU_MODE', temperature, () => callback())
  }

  enableBoostMode (callback) {
    this.temperatureBeforeBoost = this.thermostat.getCharacteristic(Characteristic.TargetTemperature).value
    this.hmDevice.setValue('BOOST_MODE', true, () => callback())
  }

  get thermostat () {
    return this.accessory.getService(Service.Thermostat)
  }
}

module.exports = HomeKitHMThermostat
