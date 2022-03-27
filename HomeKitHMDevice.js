class HomeKitHMDevice {
  constructor (accessory, device) {
    this.hmDevice = device
    this.accessory = accessory
  }

  applyMappings (mappings) {
    for (const [hmCharacteristic, mapping] of Object.entries(mappings)) {
      const service = this.accessory.getService(mapping.service) ||
                      this.accessory.addService(mapping.service)

      const characteristic = service.getCharacteristic(mapping.characteristic) ||
                             service.addCharacteristic(mapping.characteristic)

      characteristic
        .on('get', callback => {
          const value = this.hmDevice.getValue(hmCharacteristic) || mapping.defaultValue
          callback(null, value)
        })
        .on('set', (value, callback) => {
          this.hmDevice.setValue(hmCharacteristic, value, callback)
        })
    }

    this.hmDevice.on('update', (hmCharacteristic, value) => {
      const mapping = mappings[hmCharacteristic]
      if (!mapping) return

      const service = this.accessory.getService(mapping.service)
      const characteristic = service.getCharacteristic(mapping.characteristic)
      if (mapping.valueConversion) {
        value = mapping.valueConversion(value)
      }
      characteristic.updateValue(value)
    })
  }
}

module.exports = HomeKitHMDevice
