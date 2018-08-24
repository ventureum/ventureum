let AWS = require('aws-sdk')
let s3 = new AWS.S3()

const BUCKET_NAME = 'backend.ventureum.io'
const FOLDER = "contracts/"
const CARBON_VOTE_X_CORE_JSON = 'CarbonVoteXCore.json'
const VETXTOKEN_JSON = 'VetXToken.json'
const CONFIG_JSON = 'config.json'
const env = require('.env.json')

/*
 * get json from aws s3
 */
let getJsonFromS3 = async function (bucketName, key) {
  const params = {
    Bucket: bucketName,
    Key: key
  }
  const res = await s3.getObject(params).promise()

  return JSON.parse(res.Body)
}

/*
 * Load all information from aws s3
 */
let loadInfo = async function () {
  let contractBucket = "alpha.ventureum.io"
  if (env['net'] === 'demo') {
    contractBucket = "demo.ventureum.io"
  }

  /*
   * Get vetXTokenJson, carbonVoteXCoreJson, configJson from s3
   */
  const vetXTokenJson = await getJsonFromS3(contractBucket, FOLDER + VETXTOKEN_JSON)
  const carbonVoteXCoreJson = await getJsonFromS3(contractBucket, FOLDER + CARBON_VOTE_X_CORE_JSON)
  const configJson = await getJsonFromS3(BUCKET_NAME, CONFIG_JSON)

  /*
   * the address and abi of VetXToken
   */
  const vetXTokenAddress = Object.values(vetXTokenJson['networks'])[0]['address']
  const vetXTokenAbi = vetXTokenJson['abi']

  /*
   * the address and abi of CarbonVoteX
   */
  const carbonVoteXCoreAddress = Object.values(carbonVoteXCoreJson['networks'])[0]['address']
  const carbonVoteXCoreAbi = carbonVoteXCoreJson['abi']

  const info = {
    vetXTokenAbi: vetXTokenAbi,
    vetXTokenAddress: vetXTokenAddress,
    config: configJson,
    carbonVoteXCoreAbi: carbonVoteXCoreAbi,
    carbonVoteXCoreAddress: carbonVoteXCoreAddress
  }
  return info
}

module.exports = loadInfo
