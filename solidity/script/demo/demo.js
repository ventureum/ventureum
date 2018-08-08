'use strict'

const rootDir = '../../'

/*
 * Configs
 */
const OwnSolConfig = require(rootDir + 'config/ownSolConfig.js')
const ThirdPartySolConfig = require(rootDir + 'config/thirdPartySolConfig.js')
const ThirdPartyJsConfig = require(rootDir + 'config/thirdPartyJsConfig.js')

const BigNumber = require('bignumber.js')

/*
 * Contract constant
 */
const OWNER = 'owner'
const TOKEN_ADDRESS = 'tokenAddress'
const PROJECT_STATE = 'projectState'
const NAMESPACE = 'namespace'

/*
 * Constant field
 */
const NULL = "0x0"

export async function applyApplication (Contracts, artifacts, projectName, owner, expiryTime) {
  /*
   * Set parameter
   */
  const amount =
    new BigNumber(OwnSolConfig.default(artifacts).Parameterizer.paramDefaults.minDeposit)
  const availableFund = amount.div(2)
  const applicationExpiry = expiryTime
  const whitelisted = false
  const unstakedDeposit = amount.minus(amount.div(2))
  const challengeID = 0

  /*
   * deposit vtx to registry
   */
  await Contracts.vetXToken.transfer(
    Contracts.registry.address,
    amount,
    {from: owner}).should.be.fulfilled

  /*
   * registry.apply
   */
  await Contracts.registry.backDoorSetting(
    availableFund,
    applicationExpiry,
    whitelisted,
    owner,
    unstakedDeposit,
    challengeID,
    projectName)
  // projectController-registerProject
  const projectHash = ThirdPartyJsConfig.default().wweb3.utils.keccak256(projectName)
  await Contracts.projectControllerStorage.setAddress(
    ThirdPartyJsConfig.default().Web3.utils.soliditySha3(projectHash, OWNER),
    owner)
  await Contracts.projectControllerStorage.setAddress(
    ThirdPartyJsConfig.default().Web3.utils.soliditySha3(projectHash, TOKEN_ADDRESS),
    NULL)
  await Contracts.projectControllerStorage.setUint(
    ThirdPartyJsConfig.default().Web3.utils.soliditySha3(projectHash, PROJECT_STATE),
    OwnSolConfig.default(artifacts).ProjectController.State.AppSubmitted)
  await Contracts.projectControllerStorage.setBytes32(
    ThirdPartyJsConfig.default().Web3.utils.soliditySha3(owner, NAMESPACE),
    projectHash)
  // projectHashList-insert
  await Contracts.registry.backDoorInsert(projectName)
}

/*
* challenge project
*   deposit usually equal to unstakedDeposit
*/
export async function challengeProject (
  Contracts,
  artifacts,
  projectName,
  challenger,
  deposit,
  voteQuorum,
  commitEndTime,
  revealEndTime,
  votesFor,
  votesAgainst
) {
  await Contracts.vetXToken.transfer(
    Contracts.registry.address,
    deposit,
    {from: challenger})

  await Contracts.plcrVoting.backDoorStartPoll(
    voteQuorum,
    commitEndTime,
    revealEndTime,
    votesFor,
    votesAgainst
  )

  const pollId = await Contracts.plcrVoting.pollNonce.call()

  await Contracts.registry.backDoorChallenge(
    projectName,
    challenger,
    deposit,
    pollId)
}

