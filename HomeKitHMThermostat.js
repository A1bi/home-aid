const HomeKit = require('hap-nodejs')
const HomeKitHMDevice = require('./HomeKitHMDevice')

class HomeKitHMThermostat extends HomeKitHMDevice {
  constructor (accessory, device, valveOpenThreshold) {
    super(...arguments)

    this.active = false

    this.applyMappings({
      BATTERY_STATE: {
        service: HomeKit.Service.BatteryService,
        characteristic: HomeKit.Characteristic.BatteryLevel,
        defaultValue: 100
      },
      SET_TEMPERATURE: {
        service: HomeKit.Service.Thermostat,
        characteristic: HomeKit.Characteristic.TargetTemperature,
        defaultValue: 0
      },
      ACTUAL_TEMPERATURE: {
        service: HomeKit.Service.Thermostat,
        characteristic: HomeKit.Characteristic.CurrentTemperature,
        defaultValue: 0
      }
    })

    this.hmDevice
      .on('ready', () => {
        const thermostat = this.accessory.getService(HomeKit.Service.Thermostat)
        thermostat.getCharacteristic(HomeKit.Characteristic.CurrentHeatingCoolingState)
          .on('get', callback => callback(null, this.active ? 1 : 0))

        thermostat.getCharacteristic(HomeKit.Characteristic.TargetHeatingCoolingState)
          .on('set', (value, callback) => {
            var setCharacteristic
            if (value === 1) {
              setCharacteristic = 'BOOST_MODE'
              value = true
              const temp = thermostat.getCharacteristic(HomeKit.Characteristic.TargetTemperature)
              this.temperatureBeforeBoost = temp.value
            } else if (value === 3) {
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
          .updateValue(3)
      })

      .on('update', (characteristic, value) => {
        if (characteristic === 'VALVE_STATE') {
          const active = (value / 100) >= valveOpenThreshold
          if (active !== this.active) {
            this.active = active

            const thermostat = this.accessory.getService(HomeKit.Service.Thermostat)
            thermostat.getCharacteristic(HomeKit.Characteristic.CurrentHeatingCoolingState)
              .updateValue(active ? 1 : 0)
          }
        }
      })
  }
}

module.exports = HomeKitHMThermostat
