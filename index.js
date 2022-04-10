const Door = require('./Door')
const Outlets = require('./Outlets')
const HomeMaticClient = require('./HomeMaticClient')
const HomeKitServer = require('./HomeKitServer')
const config = require('./config')
const PushNotificationsService = require('./push_notifications_service')
const FritzBox = require('./fritzbox')
const http = require('http')
const fs = require('fs')

const homeMaticClients = []

const pushService = new PushNotificationsService(config.apns)

const fritz = new FritzBox(config.fritzBox)

const hkServer = new HomeKitServer()

Outlets.setDependencies(config.outlets.dependencies)
Outlets.on('stateChanged', (number, state) => {
  if (!config.outlets.legacyWifiEnabling.includes(number)) return

  var toggle = config.outlets.legacyWifiEnabling.some(number => Outlets.getState(number))
  fritz.toggleWlan24(toggle)
})

hkServer.addOutlets(config.outlets.count)
hkServer.publish(config.homeKit.pin)

config.homeMatic.rpcServerPorts.forEach(port => {
  const client = new HomeMaticClient('localhost', port)
  homeMaticClients.push(client)
  hkServer.addHomeMatic(client, config.homeMatic)
  client.init()
})

var exited = false
function exit (options) {
  if (!exited) {
    Door.exit()
    Outlets.exit()
    homeMaticClients.forEach(client => client.exit())
    exited = true
  }

  console.log('Exiting')
  if (options && options.exit) {
    process.exit()
  }
}

var sockPath = '/tmp/home-aid.sock'
if (fs.existsSync(sockPath)) fs.unlinkSync(sockPath)

http.createServer((request, response) => {
  var status = 404
  var message = 'Unknown action'
  var body = ''

  request.on('data', chunk => {
    body += chunk.toString()
  })

  request.on('end', () => {
    if (request.headers['x-auth'] !== config.api.authToken) {
      status = 401
      message = 'Invalid auth token'
    } else if (request.method === 'POST') {
      if (request.url === '/open-door') {
        Door.triggerOpener()
        status = 200
        message = 'Door opened'
      } else if (request.url === '/push-device-tokens') {
        try {
          var data = JSON.parse(body)
          if (data.token) {
            pushService.registerDeviceToken(data.token)
          }
          status = 201
          message = 'Token registered'
        } catch (e) {
          console.log(e)
          status = 400
          message = 'Invalid request'
        }
      }
    }

    response.writeHead(status, { 'Content-Type': 'text/plain' })
    response.write(message + '\n')
    response.end()

    console.log(`got web request, responded with: "${message}"`, new Date())
  })
}).listen(sockPath)

fs.chmodSync(sockPath, 666)

process.on('exit', exit)
process.on('SIGINT', exit.bind(null, { exit: true }))
