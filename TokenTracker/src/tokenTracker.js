import axios from 'axios'
import Queue from 'bull'
import Web3 from 'web3'
import ERC20_ABI from '../ERC20_ABI'
import trackedTokens from '../trackedTokens'

const {
  DB_USER,
  DB_PASSWORD,
  DB_NAME_PREFIX,
  DB_HOST_POSTFIX,
  ACCOUNT_PRIVATE_KEY,
  INFURA_API_KEY,
  REDIS,
  STAGE
} = process.env
const FEEDSYS_END_POINT = `https://7g1vjuevub.execute-api.ca-central-1.amazonaws.com/${STAGE}`
const TCR_END_POINT = `https://mfmybdhoea.execute-api.ca-central-1.amazonaws.com/${STAGE}`

class TokenTracker {
  constructor () {
    this._loadTrackedTokens()
    this._setupWeb3()
    this._configDataBase()
    this._setupQueue()
  }

  _loadTrackedTokens = () => {
    this.trackedTokens = trackedTokens
  }

  _setupWeb3 = () => {
    const web3 = new Web3(new Web3.providers.HttpProvider(
      `https://mainnet.infura.io/${INFURA_API_KEY}`
    ))
    const addedAccount = web3.eth.accounts.wallet.add(ACCOUNT_PRIVATE_KEY)
    console.log(`Account will be used in web3:${addedAccount.address}`)
    this.web3 = web3
  }

  _configDataBase = () => {
    const PORT = 5432
    const DATA_BASE = DB_NAME_PREFIX + STAGE
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
    console.log('Config:', Config)
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
      actor => actor.actor_type === 'USER' && actor.actor_profile_status === 'ACTIVATED'
    )
  }

  startUpdate = async () => {
    await this._getUserRecords()
    let addJobPromise = []
    this.userRecords.forEach(record => {
      const newJob = {
        actor: record.actor
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
    const { actor } = job.data
    // get wallet list
    const request = {
      actor: actor
    }
    let walletAddressList = []
    const result = await axios.post(
      `${FEEDSYS_END_POINT}/get-tracked-wallet-addresses`,
      request
    )
    this._responseErrorCheck(result.data)

    if (result.data.walletAddressList !== null) {
      walletAddressList = result.data.walletAddressList
    }

    // get balance
    const balances = await this._getBalance(actor, walletAddressList)

    // update votes
    await this._updateAvailableDelegateVotes(balances)

    return JSON.stringify(balances)
  }

  _getBalance = async (actor, walletAddressList) => {
    let userBalances = []
    for (let token of trackedTokens) {
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
      userBalances.push({
        balance: userTokenBalance,
        tokenName: token.name,
        tokenAddress: token.address
      })
    }
    return {
      actor,
      userBalances
    }
  }

  _updateAvailableDelegateVotes = async (balances) => {
    const { actor, userBalances } = balances
    for (let tokenBalanceInfo of userBalances) {
      const projectId = this.web3.utils.sha3(tokenBalanceInfo.tokenName)
      const request = {
        'actor': actor,
        'projectId': projectId,
        'availableDelegateVotes': tokenBalanceInfo.balance
      }
      const result = await axios.post(
        `${TCR_END_POINT}/update-available-delegate-votes`,
        request
      )
      this._responseErrorCheck(result.data)
    }
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
