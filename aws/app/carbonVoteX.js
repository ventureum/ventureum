let Web3 = require('web3')

const NAMESPACE = 'namespace'
const ADDRESS = 'address'
const MASTER_PRIVATE_KEY = 'masterPrivateKey'
const GAS_LIMIT = 'gasLimit'
const PROVIDER_URL = 'providerUrl'

class CarbonVoteX {
  constructor (info) {
    this.web3 = new Web3(info.config[PROVIDER_URL])

    const account = this.web3.eth.accounts.privateKeyToAccount(info.config[MASTER_PRIVATE_KEY])
    this.web3.eth.accounts.wallet.add(account)
    this.web3.eth.defaultAccount = account[ADDRESS]
    this.defaultAccount = account[ADDRESS]

    this.erc20TokenInstance = new this.web3.eth.Contract(
      info.erc20TokenAbi,
      info.erc20TokenAddress)

    this.carbonVoteXCoreInstance = new this.web3.eth.Contract(
      info.carbonVoteXCoreAbi,
      info.carbonVoteXCoreAddress)

    this.gasLimit = info.config[GAS_LIMIT]
    this.namespace = this.web3.utils.sha3(info[NAMESPACE])
  }

  async getBalance (pollId, address, callback) {
    let poll = await this.getPollInfo(pollId)
    let bal = await this.balanceOfByBlock(address, poll[0])
    if (poll === false || bal === -1) {
      callback('Error: get poll failed or get balance failed.')
      return -1
    }
    return bal
  }

  async getEstimateGas (pollId, address, callback) {
    let bal = await this.getBalance(pollId, address, callback)
    this.carbonVoteXCoreInstance.methods.writeAvailableVotes(
      this.namespace,
      pollId,
      address,
      bal).estimateGas({from: this.defaultAccount, gas: this.gasLimit}).then((gasAmount) => {
        console.log('gas amount ' + gasAmount)
        callback(null, {
          'statusCode': 200,
          'state': 'res',
          'body': gasAmount
        })
      }).catch((err) => {
        callback({
          'statusCode': 200,
          'state': 'err',
          'err': err
        })
      })
  }

  /*
   * get available vote rights
   */
  async getVotes (pollId, address, callback) {
    console.log('processing getVotes...')
    let bal = await this.getBalance(pollId, address)

    /*
     * check if already receive available vote right before
     */
    let bool = await this.carbonVoteXCoreInstance.methods.voteObtained(
      this.namespace,
      pollId,
      address).call()
    if (bool === true) {
      callback(null, {
        'statusCode': 200,
        'err': 'Failed: already get vote.'
      })
      return
    }

    /*
     * check if contract receive enough gas from user address
     */
    let gasAlreadySend = await this.carbonVoteXCoreInstance.methods.getGasSent(
      this.namespace,
      pollId,
      address).call()
    let estimateGas = await this.carbonVoteXCoreInstance.methods.writeAvailableVotes(
      this.namespace,
      pollId,
      address,
      bal).estimateGas({from: this.defaultAccount, gas: this.gasLimit})
    if (gasAlreadySend < estimateGas) {
      callback(null, {
        'statusCode': 200,
        'err': 'Failed: transaction need ' + estimateGas + ' gases, you only payed ' + gas + ' gases.'
      })
      return
    }

    this.carbonVoteXCoreInstance.methods.writeAvailableVotes(
      this.namespace,
      pollId,
      address,
      bal).send({from: this.defaultAccount, gas: this.gasLimit}).on('transactionHash', (hash) => {
        callback(null, {
          'statusCode': 200,
          'body': hash
        })
      })
  }

  async balanceOfByBlock (address, blockNum) {
    try {
      let bal = await this.tokenInstance.methods.balanceOf(address).call('undefined', blockNum)
      return bal
    } catch (e) {
      console.log('get balance failed. Failed message: ' + e)
      return -1
    }
  }

  async balanceOf (address) {
    try {
      let bal = await this.tokenInstance.methods.balanceOf(address).call()
      return bal
    } catch (e) {
      console.log('get balance failed. Failed message: ' + e)
      return -1
    }
  }

  async getPollInfo (pollId) {
    try {
      let poll = await this.contractInstance.methods.getPoll(pollId)
        .call({from: this.defaultAccount, gas: this.gasLimit})
      console.log('poll:' + JSON.stringify(poll))
      return poll
    } catch (e) {
      console.log('get poll failed. Failed message: ' + e)
      return false
    }
  }
}

module.exports = CarbonVoteX
