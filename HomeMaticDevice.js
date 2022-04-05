const EventEmitter = require('events').EventEmitter

class HomeMaticDevice extends EventEmitter {
  constructor (type, address, methodCall) {
    super()

    this.type = type
    this.address = address
    this.methodCall = methodCall
    this.characteristics = []
    this.values = {}

    this.methodCall('getParamset', [this.address, 'VALUES'], (err, res) => {
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
      value = value.toFixed(1)
    }
    this.methodCall('setValue', [this.address, characteristic, value], (err) => callback(err))
  }

  updateValue (characteristic, value) {
    if (characteristic === 'BATTERY_STATE') {
      value = parseInt((value - 1.5) / 3.1 * 100)
    }

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
