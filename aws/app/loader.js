let AWS = require('aws-sdk')
let s3 = new AWS.S3()

const BUCKET_NAME = 'dev.ventureum.io'
const FOLDER = "contracts/"
const REPUTATION_SYSTEM_JSON = 'ReputationSystem.json'
const CARBON_VOTE_X_CORE_JSON = 'CarbonVoteXCore.json'
const ERC20_TOKEN_JSON = 'ERC20.json'
const CONFIG_JSON = 'config.json'

let getPromise = function (key) {
  let params = {
    Bucket: BUCKET_NAME,
    Key: key
  }

  let promise = s3.getObject(params, (err) => {
    if (err) {
      console.log('Get promise for file ' + key + ' failed.' + err)
    }
  }).promise()
  return promise
}

let loadInfo = async function () {
  const reputationSystemPromise = getPromise(FOLDER + REPUTATION_SYSTEM_JSON)
  const erc20TokenPromise = getPromise(FOLDER + ERC20_TOKEN_JSON)
  const configPromise = getPromise(CONFIG_JSON)
  const carbonVoteXCorePromise = getPromise(FOLDER + CARBON_VOTE_X_CORE_JSON)

  let reputationSystemJson
  let erc20TokenJson
  let configJson
  let carbonVoteXCoreJson
  try {
    let reputationSystemPromise = await reputationSystemPromise
    let erc20TokenPromise = await erc20TokenPromise
    let configRes = await configPromise
    let carbonVoteXCoreRes = await carbonVoteXCorePromise

    reputationSystemJson = JSON.parse(reputationSystemPromise.Body)
    erc20TokenJson = JSON.parse(erc20TokenPromise.Body)
    configJson = JSON.parse(configRes.Body)
    carbonVoteXCoreJson = JSON.parse(carbonVoteXCoreRes.Body)
  } catch (e) {
    console.log('Promise Rejected:' + e)
    console.log('============Retry!')
    let info = await loadInfo()
    return info
  }
  const reputationSystemAddress = Object.values(reputationSystemJson['networks'])[0]['address']
  const reputationSystemAbi = reputationSystemJson['abi']
  const erc20TokenAddress = Object.values(erc20TokenJson['networks'])[0]['address']
  const erc20TokenAbi = erc20TokenJson['abi']
  const carbonVoteXCoreAddress = Object.values(carbonVoteXCoreJson['networks'])[0]['address']
  const carbonVoteXCoreAbi = carbonVoteXCoreJson['abi']

  let info = {
    reputationSystemAbi: reputationSystemAbi,
    reputationSystemAddress: reputationSystemAddress,
    erc20TokenAbi: erc20TokenAbi,
    erc20TokenAddress: erc20TokenAddress,
    config: configJson,
    carbonVoteXCoreAbi: carbonVoteXCoreAbi,
    carbonVoteXCoreAddress: carbonVoteXCoreAddress
  }
  return info
}

module.exports = loadInfo
