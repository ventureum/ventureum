'use strict'

const rootDir = '../../'

/*
 * Configs
 */
const OwnSolConfig = require(rootDir + 'config/ownSolConfig.js')
const ThirdPartySolConfig = require(rootDir + 'config/thirdPartySolConfig.js')
const ThirdPartyJsConfig = require(rootDir + 'config/thirdPartyJsConfig.js')

const BigNumber = require('bignumber.js')
const BN = ThirdPartyJsConfig.default().wweb3.utils.BN

/*
 * Contract constant
 */
const OWNER = 'owner'
const TOKEN_ADDRESS = 'tokenAddress'
const PROJECT_STATE = 'projectState'
const NAMESPACE = 'namespace'
const GLOBAL_MILESTONE_ID = new BN(-1)
const STATE = 'state'
const OBJS = 'objs'
const OBJ_TYPES = 'objTypes'
const OBJ_MAX_REGULATION_REWARDS = 'objMaxRegulationRewards'
const CUMULATIVE_MAX_REGULATION_REWARDS = 'cumulativeMaxRegulationRewards'
const NUMBER_MILESTONES = 'numberMilestones'
const MILESTONE_LENGTH = 'milestoneLength'
const PROJECT_TOTAL_REGULATOR_REWARDS = 'projectTotalRegulatorRewards'

/*
 * Constant field
 */
const NULL = "0x0"

async function applicationSetting (
  Contracts,
  artifacts,
  projectName,
  owner,
  expiryTime,
  whitelisted) {
  /*
   * Set parameter
   */
  const amount =
    new BigNumber(OwnSolConfig.default(artifacts).Parameterizer.paramDefaults.minDeposit)
  const availableFund = amount.div(2)
  const applicationExpiry = expiryTime
  const unstakedDeposit = amount.minus(amount.div(2))
  const projectExisted = await Contracts.registry.appWasMade(projectName)
  const challengeID = 0

  /*
   * deposit vtx to registry
   */
  await Contracts.vetXToken.transfer(
    Contracts.registry.address,
    amount).should.be.fulfilled

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
  if (projectExisted == false) {
    await Contracts.registry.backDoorInsert(projectName)
  }
}

export async function applyApplication (Contracts, artifacts, projectName, owner, expiryTime) {
  await applicationSetting(Contracts, artifacts, projectName, owner, expiryTime, false)
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

export async function whitelistProject (Contracts, artifacts, projectName, owner, expiryTime) {
  const projectHash = ThirdPartyJsConfig.default().wweb3.utils.keccak256(projectName)
  await applicationSetting(Contracts, artifacts, projectName, owner, expiryTime, true)


  await Contracts.projectControllerStorage.setUint(
    ThirdPartyJsConfig.default().Web3.utils.soliditySha3(projectHash, PROJECT_STATE),
    OwnSolConfig.default(artifacts).ProjectController.State.AppAccepted)
}

export async function projectAddMilestones (Contracts, artifacts, projectName, milestoneInfo) {
  const length = milestoneInfo[0]
  const objs = milestoneInfo[1]
  const objTypes = milestoneInfo[2]
  const rewards = milestoneInfo[3]

  const projectHash = ThirdPartyJsConfig.default().wweb3.utils.keccak256(projectName)

  const milestoneControllerStorage = Contracts.milestoneControllerStorage

  for (let i = 0; i < objs.length; i++) {
    /*
     * milestone-verifyAddingMilestone view (get milestoneId)
     */
    const numMilestones = await Contracts.milestoneControllerStorage.getUint(
      ThirdPartyJsConfig.default().Web3.utils.soliditySha3(
        projectHash,
        GLOBAL_MILESTONE_ID,
        NUMBER_MILESTONES))
    const milestoneId = numMilestones + 1

    // set number of milestone
    await Contracts.milestoneControllerStorage.setUint(
      ThirdPartyJsConfig.default().Web3.utils.soliditySha3(
        projectHash,
        GLOBAL_MILESTONE_ID,
        NUMBER_MILESTONES),
      milestoneId
    )

    /*
     * initMilestone
     */
    await Contracts.milestoneControllerStorage.setUint(
      ThirdPartyJsConfig.default().Web3.utils.soliditySha3(
        projectHash,
        milestoneId,
        MILESTONE_LENGTH),
      length[i])

    await milestoneControllerStorage.setUint(
      ThirdPartyJsConfig.default().Web3.utils.soliditySha3(
        projectHash,
        milestoneId,
        STATE),
      OwnSolConfig.default(artifacts).MilestoneController.State.INACTIVE)

    await milestoneControllerStorage.setArray(
      ThirdPartyJsConfig.default().Web3.utils.soliditySha3(
        projectHash,
        milestoneId,
        OBJS),
      objs[i])

    await milestoneControllerStorage.setArray(
      ThirdPartyJsConfig.default().Web3.utils.soliditySha3(
        projectHash,
        milestoneId,
        OBJ_TYPES),
      objTypes[i])

    await milestoneControllerStorage.setUintArray(
      ThirdPartyJsConfig.default().Web3.utils.soliditySha3(
        projectHash,
        milestoneId,
        OBJ_MAX_REGULATION_REWARDS),
      rewards[i])

    let totalMaxRewards = 0
    for (let j = 0; j < rewards.length; j++) {
      totalMaxRewards += rewards[i][j]
    }

    let projectTotalRewards = await milestoneControllerStorage.getUint(
      ThirdPartyJsConfig.default().Web3.utils.soliditySha3(
        projectHash,
        PROJECT_TOTAL_REGULATOR_REWARDS))
    projectTotalRewards += totalMaxRewards
    await milestoneControllerStorage.setUint(
      ThirdPartyJsConfig.default().Web3.utils.soliditySha3(
        projectHash,
        PROJECT_TOTAL_REGULATOR_REWARDS),
      projectTotalRewards)
  }
}
