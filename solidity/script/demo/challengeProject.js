'use strict'

const rootDir = '../../'

const OwnSolConfig = require(rootDir + 'config/ownSolConfig.js')

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
const ThirdPartyJsConstants = require(rootDir + 'config/thirdPartyJsConfig.js')

/*
 * backdoor functions
 */
const applyApplication = require(rootDir + 'script/demo/demo.js').applyApplication
const challengeProject = require(rootDir + 'script/demo/demo.js').challengeProject


module.exports = async function (callback) {
  const _thirdPartyJsConstants = ThirdPartyJsConstants.default(artifacts)
  const projectName = process.argv[4]

  if (projectName === undefined) {
    console.log("please input project nmae")
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
  await applyApplication(Contracts, artifacts, projectName, Accounts.PROJECT_OWNER, null)
  const params = OwnSolConfig.default(artifacts).Parameterizer.paramDefaults
  await challengeProject(
    Contracts,
    artifacts,
    projectName,
    Accounts.CHALLENGER,
    params.minDeposit,
    params.voteQuorum,
    null,
    null,
    0,
    0)
  console.log("challenge project done")
}
