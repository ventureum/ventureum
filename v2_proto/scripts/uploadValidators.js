const Loom = require('loom-js')
const RepSys = artifacts.require('RepSys')
const fs = require('fs')
const path = require('path')
const { promisify } = require('util')
const readFileAsync = promisify(fs.readFile)
const _cliProgress = require('cli-progress')
const Web3 = require('web3')
const axios = require('axios')
const delay = require('delay')
const uuidParse = require('uuid-parse')
require('dotenv').config({ path: path.join(__dirname, '/../.env') })

const typeKOL = '0xf4af7c06'

let baseUrl = `${process.env.FEED_ENDPOINT}/${process.env.FEED_STAGE}`

axios.defaults.headers.post['Authorization'] = process.env.ACCESS_TOKEN

const apiFeed = axios.create({
  baseURL: baseUrl,
  headers: {
    'Content-Type': 'application/json'
  }
})

apiFeed.interceptors.response.use(function (response) {
  if (!response.data.ok) {
    throw response.data
  }
  return response
}, function (error) {
  return Promise.reject(error)
})

function generatePrivateKey () {
  let privateKey = Loom.CryptoUtils.generatePrivateKey()
  let publicKey = Loom.CryptoUtils.publicKeyFromPrivateKey(privateKey)
  let address = Loom.LocalAddress.fromPublicKey(publicKey).toString()
  return { privateKey, publicKey, address }
}

function toStandardUUID (id) {
  // convert bytes16 id to standard 128-bit UUID
  const hashBytes = Buffer.from(id.substring(2), 'hex')
  const uuid = uuidParse.unparse(hashBytes)
  return uuid
}

module.exports = async function (callback) {
  try {
    var repSys = await RepSys.deployed()
    // read kol data from local file
    let data = await readFileAsync(path.join(__dirname, '/../kol_cleaned.json'), 'utf8')
    let validators = JSON.parse(data).validators

    // create a new progress bar instance and use shades_classic theme
    console.log('Registering users on chain ...')
    const bar = new _cliProgress.Bar({}, _cliProgress.Presets.shades_classic)
    bar.start(validators.length, 0)

    for (let i = 0; i < validators.length; i++) {
      let v = validators[i]
      let { privateKey, address } = generatePrivateKey()
      privateKey = Web3.utils.bytesToHex(privateKey)
      await repSys.registerUser(v.actor, address, typeKOL, 1000, JSON.stringify(v))
      bar.update(i + 1)
    }

    bar.stop()

    // wait for database update, sleep for 2 seconds
    await delay(2000)

    console.log('Updating user\'s private keys ...')

    bar.start(validators.length, 0)

    for (let i = 0; i < validators.length; i++) {
      let v = validators[i]
      let { privateKey } = generatePrivateKey()
      privateKey = Web3.utils.bytesToHex(privateKey)
      await apiFeed.post('/set-actor-private-key',
        { actor: toStandardUUID(v.actor),
          privateKey: privateKey })
      bar.update(i + 1)
    }

    bar.stop()
  } catch (err) {
    console.log(err)
  }
}
