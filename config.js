const yaml = require('js-yaml')
const fs = require('fs')
const path = require('path')

class Config {
  constructor () {
    try {
      const file = fs.readFileSync(this.filePath, 'utf8')
      this.config = yaml.safeLoad(file)
    } catch (e) {
      console.log(`Error parsing config.yml: ${e}`)
    }
  }

  get filePath () {
    return path.resolve(__dirname, 'config.yml')
  }
}

const config = new Config()

const proxy = new Proxy(config, {
  get: (target, prop, receiver) => {
    return target.config[prop]
  }
})

module.exports = proxy
