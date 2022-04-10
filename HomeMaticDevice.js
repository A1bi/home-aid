const EventEmitter = require('events').EventEmitter

class HomeMaticDevice extends EventEmitter {
  constructor (type, address, version, client) {
    super()

    this.type = type
    this.address = address
    this.version = version
    this.client = client
    this.characteristics = []
    this.values = {}

    this.client.methodCall('getParamset', [this.address, 'VALUES'], (err, res) => {
      if (err) return console.log(err)

      for (var characteristic in res) {
        this.updateValue(characteristic, res[characteristic])
      }
      this.emit('ready')
    })
  }

  getValue (characteristic) {
    return this.values[characteristic]
  }

  setValue (characteristic, value, callback) {
    console.log('setting value', characteristic, value)
    if (typeof value === 'number') {
      value = { explicitDouble: value.toFixed(1) }
    }
    this.client.methodCall('setValue', [this.address, characteristic, value], (err) => callback(err))
  }

  updateValue (characteristic, value) {
    if (this.values[characteristic] !== value) {
      this.values[characteristic] = value
      return true
    }

    return false
  }

  applyUpdate (characteristic, value) {
    if (this.updateValue(characteristic, value)) {
      this.emit('update', characteristic, value)
    }
  }

  getCharacteristics () {
    return Object.keys(this.values)
  }
}

module.exports = HomeMaticDevice
