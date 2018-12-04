import axios from 'axios'
import Queue from 'bull'
import Web3 from 'web3'
import ERC20_ABI from '../ERC20_ABI'
import trackedTokens from '../trackedTokens'
import RepSysExp from './RepSysExp.json'
import RepSysBeta from './RepSysBeta.json'

const {
  NonceTxMiddleware,
  SignedTxMiddleware,
  Client,
  LocalAddress,
  CryptoUtils,
  LoomProvider,
  createJSONRPCClient
} = require('loom-js')

const {
  DB_USER,
  DB_PASSWORD,
  DB_NAME_PREFIX,
  DB_HOST_POSTFIX,
  ETHEREUM_PRIVATE_KEY,
  INFURA_API_KEY,
  REDIS,
  DATA_BASE_STAGE,
  API_STAGE,
  LOOM_END_POINT,
  ACCESS_TOKEN,
  LOOM_PRIVATE_KEY
} = process.env

const FEEDSYS_END_POINT = `https://7g1vjuevub.execute-api.ca-central-1.amazonaws.com/${API_STAGE}`
const NETWORK_ID = 'default'

const feedSysAPI = axios.create({
  baseURL: FEEDSYS_END_POINT,
  headers: {
    'Authorization': ACCESS_TOKEN,
    'Content-Type': 'application/json'
  }
})

function getClient (privateKey, publicKey) {
  const writer = createJSONRPCClient({ protocols: [{ url: `http://${LOOM_END_POINT}:46658/rpc` }] })
  const reader = createJSONRPCClient({ protocols: [{ url: `http://${LOOM_END_POINT}:46658/query` }] })
  const client = new Client(
    NETWORK_ID,
    writer,
    reader
  )

  client.txMiddleware = [
    new NonceTxMiddleware(publicKey, client),
    new SignedTxMiddleware(privateKey)
  ]

  return client
}

class TokenTracker {
  constructor () {
    this._loadTrackedTokens()
    this._setupWeb3()
    this._setupLoom(LOOM_PRIVATE_KEY)
    this._createContractInstance()
    this._configDataBase()
    this._setupQueue()
  }

  _setupLoom = (privateKey) => {
    privateKey = CryptoUtils.B64ToUint8Array(privateKey)
    let publicKey = CryptoUtils.publicKeyFromPrivateKey(privateKey)
    this.from = LocalAddress.fromPublicKey(publicKey).toString()
    this.client = getClient(privateKey, publicKey)
    this.loomWeb3 = new Web3(new LoomProvider(this.client, privateKey))
    this.user = this.from
    console.log(`Account will be used in Loom:${this.user}`)

    this.client.on('error', msg => {
      console.error('Error on connect to client', msg)
      console.warn('Please verify if loom command is running')
      this.disconnect()
      throw msg
    })
  }

  async disconnect () {
    await this.client.disconnect()
  }

  _createContractInstance () {
    let RepSys = RepSysExp
    if (API_STAGE === 'beta') {
      console.log(`Using ${API_STAGE} loom contract`)
      RepSys = RepSysBeta
    }
    this.RepSysCurrentNetwork = RepSys.networks[NETWORK_ID]
    if (!this.RepSysCurrentNetwork) {
      throw Error('Contract not deployed on Loom')
    }

    const RepSysABI = RepSys.abi
    this.repSysInstance = new this.loomWeb3.eth.Contract(RepSysABI, this.RepSysCurrentNetwork.address, {
      from: this.user
    })
  }

  // Repsys function:
  _writeVotes = (projectId, address, val) => {
    return this.repSysInstance.methods.writeVotes(
      projectId,
      address,
      val).send()
  }

  _loadTrackedTokens = () => {
    this.trackedTokens = trackedTokens
  }

  _setupWeb3 = () => {
    const web3 = new Web3(new Web3.providers.HttpProvider(
      `https://mainnet.infura.io/${INFURA_API_KEY}`
    ))
    const addedAccount = web3.eth.accounts.wallet.add(ETHEREUM_PRIVATE_KEY)
    console.log(`Account will be used in Ethereum:${addedAccount.address}`)
    this.web3 = web3
  }

  _configDataBase = () => {
    const PORT = 5432
    const DATA_BASE = DB_NAME_PREFIX + DATA_BASE_STAGE
    const Config = {
      client: 'pg',
      connection: {
        host: `${DATA_BASE}${DB_HOST_POSTFIX}`,
        port: PORT,
        user: DB_USER,
        password: DB_PASSWORD,
        database: DATA_BASE
      }
    }
    console.log(`Data base: ${DATA_BASE}${DB_HOST_POSTFIX}`)
    this.knex = require('knex')(Config)
  }

  _setupQueue = () => {
    this.fetchQueue = new Queue('fetch queue', `redis://${REDIS}`)

    this.fetchQueue.process('update', this._update)

    this.fetchQueue.on('progress', function (job, progress) {
      console.log(`Job ${job.id} (${job.name}) is ${progress * 100}% ready!`)
    })

    this.fetchQueue.on('completed', function (job, result) {
      console.log(`Job ${job.id} (${job.name}) completed! result: ${result}`)
      job.remove()
    })

    this.fetchQueue.on('failed', function (job, err) {
      console.log(`Job ${job.id} (${job.name}) failed! Error: ${err}`)
    })
    this.fetchQueue.on('stalled', function (job) {
      console.log(`Job ${job.id} (${job.name}) stalled`)
    })
  }

  _getUserRecords = async () => {
    const actorRecords = await this.knex.select().table('actor_profile_records')
    this.knex.destroy()
    this.userRecords = actorRecords.filter(
      actor => actor.actor_type === 'USER' &&
       actor.actor_profile_status === 'ACTIVATED' &&
       actor.public_key !== ''
    )
  }

  startUpdate = async () => {
    await this._getUserRecords()
    let addJobPromise = []
    this.userRecords.forEach(record => {
      const newJob = {
        actor: record.actor,
        userPublicKey: record.public_key
      }
      addJobPromise.push(this.fetchQueue.add('update', newJob))
    })

    // await until all jobs are added successfully
    await Promise.all(addJobPromise)

    // close queue if no jobs are active
    const intervalId = setInterval(async () => {
      const counts = await this.fetchQueue.getJobCounts()
      if (counts.active === 0) {
        this.fetchQueue.close()
        clearInterval(intervalId)
      }
    },
    1000)
  }

  _responseErrorCheck = (responseData) => {
    if (!responseData.ok) {
      throw new Error(JSON.stringify(responseData))
    }
  }

  _update = async (job) => {
    const { actor, userPublicKey } = job.data
    // get wallet list
    const request = {
      actor: actor
    }
    let walletAddressList = []
    const result = await feedSysAPI.post(
      `/get-tracked-wallet-addresses`,
      request
    )
    this._responseErrorCheck(result.data)

    if (result.data.walletAddressList !== null) {
      walletAddressList = result.data.walletAddressList
    }

    // addressBalances
    const addressBalances = await this._getAddressBalances(walletAddressList)

    // update contract votes
    await this._updateContractVotes(actor, userPublicKey, addressBalances)

    const returnValue = `Finished user ${actor}'s token balances, see log above for details`
    return returnValue
  }

  _getAddressBalances = async (walletAddressList) => {
    let AddressBalances = []
    for (let token of this.trackedTokens) {
      // get balance for each tracked token
      const addressBalance = await Promise.all(walletAddressList.map(async (walletAddress, i) => {
        const tokenInstance = new this.web3.eth.Contract(ERC20_ABI, token.address)
        const decimalBalance = await tokenInstance.methods.balanceOf(walletAddress).call()
        const balance = Math.round(decimalBalance / Math.pow(10, token.decimals))
        return balance
      }))

      const userTokenBalance = addressBalance.reduce(
        (accumulator, currentValue) => accumulator + Number(currentValue), 0
      )

      AddressBalances.push({
        balance: userTokenBalance,
        tokenName: token.name
      })
    }
    return AddressBalances
  }

  _updateContractVotes = async (actor, userPublicKey, addressBalances) => {
    for (let tokenBalance of addressBalances) {
      const { tokenName, balance } = tokenBalance
      const projectId = this.web3.utils.sha3(tokenName)
      try {
        await this._writeVotes(projectId, userPublicKey, balance)
        console.log(`Updated user ${actor} holding public_key ${userPublicKey} with ${balance} votes for project ${tokenName}`)
      } catch (e) {
        console.log(`Failed to update user ${actor} holding public_key ${userPublicKey} with ${balance} votes for project ${tokenName}`)
      }
    }

    // The following method results in error: "tx sequence does not match"
    // This needs to be investigate in the future
    // await Promise.all(addressBalances.map((tokenBalance) => {
    //   const { tokenName, balance } = tokenBalance
    //   const projectId = this.web3.utils.sha3(tokenName)
    //   return this._writeVotes(projectId, userPublicKey, balance)
    // }))
  }
}

exports.handler = async (event, context, callback) => {
  let t = new TokenTracker()

  try {
    await t.startUpdate()
    return callback(null, {
      statusCode: 200,
      body: ''
    })
  } catch (e) {
    return callback(e, {
      statusCode: 500,
      body: ''
    })
  }
}

async function main () {
  let t = new TokenTracker()

  await t.startUpdate()
}

main()
