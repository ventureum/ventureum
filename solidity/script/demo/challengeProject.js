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

/*
 * backdoor functions
 */
const applyApplication = require(rootDir + 'script/demo/demo.js').applyApplication
const challengeProject = require(rootDir + 'script/demo/demo.js').challengeProject


module.exports = async function (callback) {
  const projectName = "Project in challenge stage"

  /*
   * Accounts and Contracts
   */ const Accounts = getDemoAccounts(web3)
  const Contracts = await deployedContracts.getContracts(artifacts)

  /*
   * Ether&Token prepare
   */
  const projectOwnerInitVtx = new BigNumber("500000" + '0'.repeat(18))
  await Contracts.vetXToken.transfer(Accounts.PROJECT_OWNER, projectOwnerInitVtx)
  await Contracts.vetXToken.transfer(Accounts.CHALLENGER, projectOwnerInitVtx)

  /*
   * Backdoor functions
   */
  advanceBlock(web3)
  const expiryTime = latestTime(web3) + 100000
  await applyApplication(Contracts, artifacts, projectName, Accounts.PROJECT_OWNER, expiryTime)
  const params = OwnSolConfig.default(artifacts).Parameterizer.paramDefaults
  await challengeProject(
    Contracts,
    artifacts,
    projectName,
    Accounts.CHALLENGER,
    params.minDeposit,
    params.voteQuorum,
    params.commitStageLength + latestTime(web3),
    params.revealStageLength + latestTime(web3),
    0,
    0)
}
