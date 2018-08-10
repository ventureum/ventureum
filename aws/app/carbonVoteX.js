const Web3 = require('web3')

const NAMESPACE = 'namespace'
const ADDRESS = 'address'
const MASTER_PRIVATE_KEY = 'masterPrivateKey'
const GAS_LIMIT = 'gasLimit'
const PROVIDER_URL = 'providerUrl'

class CarbonVoteX {
  constructor (info) {
    /*
     * create web3
     */
    const web3 = new Web3(info.config[PROVIDER_URL])

    /*
     * load root account and set root account to be default account
     */
    const account = web3.eth.accounts.privateKeyToAccount(info.config[MASTER_PRIVATE_KEY])
    web3.eth.accounts.wallet.add(account)
    web3.eth.defaultAccount = account[ADDRESS]
    this.defaultAccount = account[ADDRESS]

    /*
     * VetXToken
     */
    this.vetXToken = new web3.eth.Contract(
      info.vetXTokenAbi,
      info.vetXTokenAddress)

    /*
     * CarbonVoteXCore
     */
    this.carbonVoteXCore = new web3.eth.Contract(
      info.carbonVoteXCoreAbi,
      info.carbonVoteXCoreAddress)

    /*
     * Namespace and gaslimit
     */
    this.namespace = web3.utils.sha3('ReputationSystem')
    this.gasLimit = info.config[GAS_LIMIT]
  }

  /*
   * Get the VetXToken balance of the given address when the given poll started
   */
  async getPollStartBalance (pollId, address, callback) {
    const poll = await this.getPollInfo(pollId, callback)
    const blockNum = poll[0]
    const bal = await this.balanceOfByBlock(address, blockNum, callback)

    /*
     * when the given pollId not exist
     */
    if (poll === false) {
      callback('Error: get poll (id: ' + pollId + ') failed')
      return -1
    }

    /*
     * when cannot find address's vtx balance when poll started
     */
    if (bal === -1) {
      callback('Error: get balance of ' + address + ' when block(#' + blockNum + ')failed.')
      return -1
    }

    return bal
  }

  /*
   * get the estimate gas when call writeAvailableVotes
   */
  async getEstimateGas (pollId, address, callback) {
    const bal = await this.getPollStartBalance(pollId, address, callback)

    this.carbonVoteXCore.methods.writeAvailableVotes(this.namespace, pollId, address, bal)
      .estimateGas({from: this.defaultAccount, gas: this.gasLimit})
      .then((gasAmount) => {
        /*
         * callback success when receive gas amount
         */
        callback(null, {
          'statusCode': 200,
          'state': 'res',
          'body': gasAmount
        })
      }).catch((err) => {
        /*
         * callback failed when this transaction revert
         */
        callback(err)
      })
  }

  /*
   * write available vote rights to this poll
   */
  async writeAvailableVotes (pollId, address, callback) {
    const bal = await this.getPollStartBalance(pollId, address)

    /*
     * check if already receive available vote right before
     */
    const bool =
      await this.carbonVoteXCore.methods.voteObtained(this.namespace, pollId, address).call()
    if (bool === true) {
      /*
       * callback failed when this address already received vote rights
       */
      callback('Failed: already get vote.')
      return
    }

    /*
     * check if contract receive enough gas from user address
     */
    const gasAlreadySend = await this.carbonVoteXCore.methods.getGasSent(
      this.namespace,
      pollId,
      address).call()
    const estimateGas = await this.carbonVoteXCore.methods.writeAvailableVotes(
      this.namespace,
      pollId,
      address,
      bal).estimateGas({from: this.defaultAccount, gas: this.gasLimit})
    if (gasAlreadySend < estimateGas) {
      /*
       * callback failed when not received enough gas.
       */
      callback('Failed: transaction need ' + estimateGas +
        ' gases, you only payed ' + gasAlreadySend + ' gases.')
      return
    }

    /*
     * write available votes for the given address
     */
    this.carbonVoteXCore.methods.writeAvailableVotes(
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

  /*
   * get the vtx balance of the given address when the given block number
   */
  async balanceOfByBlock (address, blockNum, callback) {
    try {
      const bal = await this.vetXToken.methods.balanceOf(address).call('undefined', blockNum)
      return bal
    } catch (e) {
      callback('get balance failed. Failed message: ' + e)
      return -1
    }
  }

  /*
   * get information of the given pollId
   */
  async getPollInfo (pollId, callback) {
    try {
      const poll = await this.carbonVoteXCore.methods.getPoll(this.namespace, pollId)
        .call({from: this.defaultAccount, gas: this.gasLimit})
      return poll
    } catch (e) {
      callback('get poll failed. Failed message: ' + e)
      return false
    }
  }
}

module.exports = CarbonVoteX
