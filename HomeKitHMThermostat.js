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
        const thermostat = this.accessory.getService(Service.Thermostat)
        thermostat.getCharacteristic(Characteristic.CurrentHeatingCoolingState)
          .on('get', callback => callback(null, this.active ? Characteristic.CurrentHeatingCoolingState.HEAT : Characteristic.CurrentHeatingCoolingState.OFF))

        thermostat.getCharacteristic(Characteristic.TargetHeatingCoolingState)
          .on('set', (value, callback) => {
            var setCharacteristic
            if (value === Characteristic.TargetHeatingCoolingState.HEAT) {
              setCharacteristic = 'BOOST_MODE'
              value = true
              const temp = thermostat.getCharacteristic(Characteristic.TargetTemperature)
              this.temperatureBeforeBoost = temp.value
            } else if (value === Characteristic.TargetHeatingCoolingState.AUTO) {
              if (this.hmDevice.getValue('CONTROL_MODE') !== 1) {
                setCharacteristic = 'MANU_MODE'
                value = this.temperatureBeforeBoost || 19
              }
            }

            if (setCharacteristic) {
              this.hmDevice.setValue(setCharacteristic, value, () => callback())
            } else {
              callback()
            }
          })
          .updateValue(Characteristic.TargetHeatingCoolingState.AUTO)
      })

      .on('update', (characteristic, value) => {
        if (characteristic === this.constructor.valveStateDatapoint) {
          const active = (value / this.constructor.valveStateDivisor) >= valveOpenThreshold
          if (active !== this.active) {
            this.active = active

            const thermostat = this.accessory.getService(Service.Thermostat)
            thermostat.getCharacteristic(Characteristic.CurrentHeatingCoolingState)
              .updateValue(active ? Characteristic.CurrentHeatingCoolingState.HEAT
                : Characteristic.CurrentHeatingCoolingState.OFF)
          }
        }
      })
  }
}

module.exports = HomeKitHMThermostat
