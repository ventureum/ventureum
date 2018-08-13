'use strict'

const rootDir = '../../'
/*
 * TimeSetter
 */
const latestTime = require(rootDir + 'config/TimeSetter.js').latestTime
const advanceBlock = require(rootDir + 'config/TimeSetter.js').advanceBlock

/*
 * tools
 */
const deployedContracts = require(rootDir + 'config/deployedContracts.js')
const getDemoAccounts = require(rootDir + 'script/demo/accounts.js').getDemoAccounts
const BigNumber = require('bignumber.js')

/*
 * backdoor functions
 */
const whitelistProject = require(rootDir + 'script/demo/demo.js').whitelistProject


module.exports = async function (callback) {
  /*
   * Accounts and Contracts
   */
  const Accounts = getDemoAccounts(web3)
  const Contracts = await deployedContracts.getContracts(artifacts)

  /*
   * Ether&Token prepare
   */
  const projectOwnerInitVtx = new BigNumber("500000" + '0'.repeat(18))

  /*
   * Backdoor functions
   */
  advanceBlock(web3)
  const expiryTime = latestTime(web3) + 10000000
  await whitelistProject(Contracts, artifacts, "Project whitelisted", Accounts.PROJECT_OWNER, expiryTime)
  console.log("whitelist project end")
}
