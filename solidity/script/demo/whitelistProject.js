'use strict'

const rootDir = '../../'

/*
 * tools
 */
const deployedContracts = require(rootDir + 'config/deployedContracts.js')
const getDemoAccounts = require(rootDir + 'script/demo/accounts.js').getDemoAccounts
const BigNumber = require('bignumber.js')
const ThirdPartyJsConstants = require(rootDir + 'config/thirdPartyJsConfig.js')

/*
 * backdoor functions
 */
const whitelistProject = require(rootDir + 'script/demo/demo.js').whitelistProject

module.exports = async function (callback) {
  const _thirdPartyJsConstants = ThirdPartyJsConstants.default(artifacts)
  const projectName = process.argv[4]

  if (projectName === undefined) {
    console.log("please input project name")
    return
  }

  /*
   * Accounts and Contracts
   */
  const Accounts = getDemoAccounts(web3)
  const Contracts = await deployedContracts.getContracts(artifacts)

  /*
   * Backdoor functions
   */
  await whitelistProject(Contracts, artifacts, projectName, Accounts.PROJECT_OWNER, null)
  console.log("whitelist project end")
}
