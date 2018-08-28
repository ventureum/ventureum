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

const keccak256 = ThirdPartyJsConfig.default().wweb3.utils.keccak256

/*
 * Contract constant
 */
const OWNER = keccak256('owner')
const TOKEN_ADDRESS = keccak256('tokenAddress')
const PROJECT_STATE = keccak256('projectState')
const NAMESPACE = keccak256('namespace')
const STATE = keccak256('state')
const OBJS = keccak256('objs')
const OBJ_TYPES = keccak256('objTypes')
const OBJ_MAX_REGULATION_REWARDS = keccak256('objMaxRegulationRewards')
const CUMULATIVE_MAX_REGULATION_REWARDS = keccak256('cumulativeMaxRegulationRewards')
const NUMBER_MILESTONES = keccak256('numberMilestones')
const MILESTONE_LENGTH = keccak256('milestoneLength')
const PROJECT_TOTAL_REGULATOR_REWARDS = keccak256('projectTotalRegulatorRewards')
const RATE = keccak256("rate")
const TOTAL_TOKEN_FOR_SALE = keccak256("totalTokenForSale")
const TOTAL_TOKEN_SOLD = keccak256("totalTokenSold")
const TOTAL_ETH_RECEIVED = keccak256("totalEthReceived")
const FINALIZED = keccak256("finalized")
const AVERAGE_PRICE = keccak256("averagePrice")
const PROJECT_TOKEN_BALANCE = keccak256("projectTokenBalance")
const PROJECT_ETHER_BALANCE = keccak256("projectEtherBalance")
const START_TIME = keccak256("startTime")
const END_TIME = keccak256("endTime")
const WEI_LOCKED = keccak256("weiLocked")
const MILESTONE_ETHER_WEILOCKED = keccak256('milestoneEtherWeilocked')
const AVAILABLE_TIME = keccak256('availableTime')
const MILESTONE_ETHER_REFUND_LOCKED = keccak256('milestoneEtherRefundLocked')

const FALSE = 0
const TRUE = 1
const GLOBAL_MILESTONE_ID = new BN(-1)

/*
 * Constant field
 */
const NULL = "0x0"

async function calcTime(artifacts, time, key) {
  const _thirdPartyJsConstants = ThirdPartyJsConfig.default(artifacts)
  const _ownSolConstants = OwnSolConfig.default(artifacts)

  if (time === null) {
    const blockInfo = await _thirdPartyJsConstants.wweb3.eth.getBlock('latest')
    const length = _ownSolConstants.Parameterizer.paramDefaults[key]
    return blockInfo.timestamp + length
  }
  return time
}

async function applicationSetting (
  Contracts,
  artifacts,
  projectName,
  owner,
  expiryTime,
  whitelisted) {
  console.log("applicationSetting begin ...")
  /*
   * Set parameter
   */
  const amount =
    new BigNumber(OwnSolConfig.default(artifacts).Parameterizer.paramDefaults.minDeposit)
  const availableFund = amount.div(2)
  const applicationExpiry = await calcTime(artifacts, expiryTime, "applyStageLength")
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
  console.log("applicationSetting end")
}

export async function removeProject (
  Contracts,
  artifacts,
  projectName) {

  /*
   * registry clear all data
   */
  const projectExisted = await Contracts.registry.appWasMade(projectName)
  await Contracts.registry.backDoorSetting(0, 0, false, NULL, 0, 0, projectName)


  // projectController-registerProject
  const projectHash = ThirdPartyJsConfig.default().wweb3.utils.keccak256(projectName)
  const owner = await Contracts.projectControllerStorage.getAddress(
    ThirdPartyJsConfig.default().Web3.utils.soliditySha3(projectHash, OWNER))

  await Contracts.projectControllerStorage.setAddress(
    ThirdPartyJsConfig.default().Web3.utils.soliditySha3(projectHash, OWNER),
    "0x0")
  await Contracts.projectControllerStorage.setAddress(
    ThirdPartyJsConfig.default().Web3.utils.soliditySha3(projectHash, TOKEN_ADDRESS),
    NULL)
  await Contracts.projectControllerStorage.setUint(
    ThirdPartyJsConfig.default().Web3.utils.soliditySha3(projectHash, PROJECT_STATE),
    OwnSolConfig.default(artifacts).ProjectController.State.NotExist)
  if (owner !== "0x" + '0'.repeat(32)) {
    await Contracts.projectControllerStorage.setBytes32(
      ThirdPartyJsConfig.default().Web3.utils.soliditySha3(owner, NAMESPACE),
      "0x0")
  }

  await initMilestone(Contracts, artifacts, projectName)

  // projectHashList-remove
  if (projectExisted == true) {
    await Contracts.registry.backDoorRemove(projectName)
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
  console.log("challengeProject begin ...")
  /*
   * calc commit end time and reveal end time
   */
  commitEndTime = await calcTime(artifacts, commitEndTime, "commitStageLength")
  revealEndTime = await calcTime(artifacts, revealEndTime, "revealStageLength")

  await Contracts.vetXToken.transfer(
    Contracts.registry.address,
    deposit)

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
  console.log("challengeProject end")
}

export async function whitelistProject (Contracts, artifacts, projectName, owner, expiryTime) {
  const projectHash = ThirdPartyJsConfig.default().wweb3.utils.keccak256(projectName)
  await applicationSetting(Contracts, artifacts, projectName, owner, expiryTime, true)

  await Contracts.projectControllerStorage.setUint(
    ThirdPartyJsConfig.default().Web3.utils.soliditySha3(projectHash, PROJECT_STATE),
    OwnSolConfig.default(artifacts).ProjectController.State.AppAccepted)
}

export async function initMilestone (Contracts, artifacts, projectName) {
  console.log("initMilestone begin ...")
  const projectHash = ThirdPartyJsConfig.default().wweb3.utils.keccak256(projectName)

  const milestoneLength = await Contracts.milestoneControllerStorage.getUint(
    ThirdPartyJsConfig.default().Web3.utils.soliditySha3(
      projectHash,
      GLOBAL_MILESTONE_ID,
      NUMBER_MILESTONES))

  await Contracts.milestoneControllerStorage.setUint(
    ThirdPartyJsConfig.default().Web3.utils.soliditySha3(
      projectHash,
      GLOBAL_MILESTONE_ID,
      NUMBER_MILESTONES),
    0)

  await Contracts.milestoneControllerStorage.setUint(
    ThirdPartyJsConfig.default().Web3.utils.soliditySha3(
      projectHash,
      PROJECT_TOTAL_REGULATOR_REWARDS),
    0)

  for (let i = 0; i < milestoneLength; i++) {
    const milestoneId = i + 1
    await Contracts.milestoneControllerStorage.setUint(
      ThirdPartyJsConfig.default().Web3.utils.soliditySha3(
        projectHash,
        milestoneId,
        STATE
      ),
      OwnSolConfig.default(artifacts).MilestoneController.State.INACTIVE
    )
  }
  console.log("initMilestone end")
}

export async function projectAddMilestones (Contracts, artifacts, projectName, milestoneInfo) {
  console.log("projectAddMilestones begin ...")
  const length = milestoneInfo.length
  const objs = milestoneInfo.objs
  const objTypes = milestoneInfo.objTypes
  const rewards = milestoneInfo.rewards

  const projectHash = ThirdPartyJsConfig.default().wweb3.utils.keccak256(projectName)

  const milestoneControllerStorage = Contracts.milestoneControllerStorage

  const numMilestones = await milestoneControllerStorage.getUint(
    ThirdPartyJsConfig.default().Web3.utils.soliditySha3(
      projectHash,
      GLOBAL_MILESTONE_ID,
      NUMBER_MILESTONES))

  // set number of milestone
  await milestoneControllerStorage.setUint(
    ThirdPartyJsConfig.default().Web3.utils.soliditySha3(
      projectHash,
      GLOBAL_MILESTONE_ID,
      NUMBER_MILESTONES),
    numMilestones.plus(objs.length))

  let firstMilestoneId = numMilestones.plus(1)
  let totalMaxRewards = 0

  for (let i = 0; i < objs.length; i++) {
    /*
     * milestone-verifyAddingMilestone view (get milestoneId)
     */
    let milestoneId = firstMilestoneId.plus(i)

    /*
     * initMilestone
     */
    await milestoneControllerStorage.setUint(
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

    for (let j = 0; j < rewards.length; j++) {
      totalMaxRewards += rewards[i][j]
    }
  }

  let projectTotalRewards = await milestoneControllerStorage.getUint(
    ThirdPartyJsConfig.default().Web3.utils.soliditySha3(
      projectHash,
      PROJECT_TOTAL_REGULATOR_REWARDS))
  projectTotalRewards = projectTotalRewards.plus(totalMaxRewards)
  await milestoneControllerStorage.setUint(
    ThirdPartyJsConfig.default().Web3.utils.soliditySha3(
      projectHash,
      PROJECT_TOTAL_REGULATOR_REWARDS),
    projectTotalRewards)

  console.log("projectAddMilestones end")
}

export async function tokenSale(Contracts, artifacts, projectName, tokenSaleInfo) {
  const projectHash = ThirdPartyJsConfig.default().wweb3.utils.keccak256(projectName)
  const defaultAccounts = await ThirdPartyJsConfig.default().wweb3.eth.getAccounts()
  const rate = tokenSaleInfo.rate
  const projectToken = tokenSaleInfo.projectToken
  const tokenAddress = projectToken.address
  const initTotalTokenForSale = tokenSaleInfo.initTotalTokenForSale
  const projectTokenBalance = tokenSaleInfo.projectTokenBalance
  const totalEtherReceived = tokenSaleInfo.totalEtherReceived

  const maxRewards = await Contracts.milestoneControllerStorage.getUint(
    ThirdPartyJsConfig.default().Web3.utils.soliditySha3(
      projectHash,
      PROJECT_TOTAL_REGULATOR_REWARDS))
  const projectEtherBalance = (new BigNumber(totalEtherReceived)).minus(maxRewards)

  /*
   * start token sale
   */
  await Contracts.tokenSaleStorage.setUint(
    ThirdPartyJsConfig.default().Web3.utils.soliditySha3(projectHash, RATE),
    rate)

  await Contracts.tokenSaleStorage.setAddress(
    ThirdPartyJsConfig.default().Web3.utils.soliditySha3(projectHash, TOKEN_ADDRESS),
    tokenAddress)

  await Contracts.tokenSaleStorage.setUint(
    ThirdPartyJsConfig.default().Web3.utils.soliditySha3(projectHash, TOTAL_TOKEN_FOR_SALE),
    initTotalTokenForSale)

  // Note: there are also three setUint:
  //     TOTAL_TOKEN_SOLD, TOTAL_ETH_RECEIVED, FINALIZED
  // those three field will changed when finalized, so remove from here avoid duplicate


  // token collector deposit projectTokenBalance projectToken
  await projectToken.transfer(Contracts.tokenCollector.address, projectTokenBalance)
  const projectTokenBalanceKey = ThirdPartyJsConfig.default().Web3.utils.soliditySha3(
    projectHash,
    PROJECT_TOKEN_BALANCE)
  await Contracts.tokenCollectorStorage.setUint(projectTokenBalanceKey, projectTokenBalance)

  // projectController setState to TokenSale
  await Contracts.projectControllerStorage.setUint(
    ThirdPartyJsConfig.default().Web3.utils.soliditySha3(projectHash, PROJECT_STATE),
    OwnSolConfig.default(artifacts).ProjectController.State.TokenSale)

  // projectController setTokenAddress to tokenAddress
  await Contracts.projectControllerStorage.setAddress(
    ThirdPartyJsConfig.default().Web3.utils.soliditySha3(projectHash, TOKEN_ADDRESS),
    tokenAddress)

  /*
   * buy token
   */
  // ether collector deposit numEther
  await ThirdPartyJsConfig.default().wweb3.eth.sendTransaction({
    from: defaultAccounts[0],
    to: Contracts.etherCollector.address,
    value: projectEtherBalance
  })
  const projectEtherBalanceKey = ThirdPartyJsConfig.default().Web3.utils.soliditySha3(
    projectHash,
    PROJECT_ETHER_BALANCE)
  await Contracts.etherCollectorStorage.setUint(projectEtherBalanceKey, projectEtherBalance)

  /*
   * finalize
   */
  const totalTokenSold = initTotalTokenForSale - projectTokenBalance

  await Contracts.tokenSaleStorage.setUint(
    ThirdPartyJsConfig.default().Web3.utils.soliditySha3(projectHash, TOTAL_TOKEN_SOLD),
    totalTokenSold)

  await Contracts.tokenSaleStorage.setUint(
    ThirdPartyJsConfig.default().Web3.utils.soliditySha3(projectHash, TOTAL_ETH_RECEIVED),
    totalEtherReceived)

  let avg = rate

  await Contracts.tokenSaleStorage.setUint(
    ThirdPartyJsConfig.default().Web3.utils.soliditySha3(projectHash, AVERAGE_PRICE),
    avg)

  await Contracts.tokenSaleStorage.setUint(
    ThirdPartyJsConfig.default().Web3.utils.soliditySha3(projectHash, FINALIZED),
    TRUE)

  // milestone controller get project total regulator rewards
  await ThirdPartyJsConfig.default().wweb3.eth.sendTransaction({
    from: defaultAccounts[0],
    to: Contracts.etherCollector.address,
    value: maxRewards
  })
  await Contracts.etherCollectorStorage.setUint(
    ThirdPartyJsConfig.default().Web3.utils.soliditySha3(
      projectHash,
      PROJECT_TOTAL_REGULATOR_REWARDS),
    maxRewards)
}

export async function activateMilestone(Contracts, artifacts, projectName, milestoneInfo) {
  const projectHash = ThirdPartyJsConfig.default().wweb3.utils.keccak256(projectName)
  const defaultAccounts = await ThirdPartyJsConfig.default().wweb3.eth.getAccounts()

  const milestoneId = milestoneInfo.id
  const weiLocked = milestoneInfo.weiLocked
  const minStartTime = milestoneInfo.minStartTime
  const maxStartTime = milestoneInfo.maxStartTime
  const startTime = milestoneInfo.startTime
  const endTime = milestoneInfo.endTime
  const objMaxRegulationRewards = milestoneInfo.rewards


  await Contracts.milestoneControllerStorage.setUint(
    ThirdPartyJsConfig.default().Web3.utils.soliditySha3(
      projectHash,
      milestoneId,
      STATE),
    OwnSolConfig.default(artifacts).MilestoneController.State.IP)

  await Contracts.milestoneControllerStorage.setUint(
    ThirdPartyJsConfig.default().Web3.utils.soliditySha3(
      projectHash,
      milestoneId,
      WEI_LOCKED),
    weiLocked)

  /*
   * ScheduleMilestone
   */
  await Contracts.projectControllerStorage.setUint(
    ThirdPartyJsConfig.default().Web3.utils.soliditySha3(projectHash, PROJECT_STATE),
    OwnSolConfig.default(artifacts).ProjectController.State.Milestone)

  await Contracts.milestoneControllerStorage.setUint(
    ThirdPartyJsConfig.default().Web3.utils.soliditySha3(
      projectHash,
      milestoneId,
      START_TIME),
    startTime)

  await Contracts.milestoneControllerStorage.setUint(
    ThirdPartyJsConfig.default().Web3.utils.soliditySha3(
      projectHash,
      milestoneId,
      END_TIME),
    endTime)

  /*
   * update cumulative max regulation rewards
   * updateCumulativeMaxRegulationRewards
   */
  // calCumulativeMaxRewards(namespace, objMaxRegulationRewards)
  let cumulativeMaxRewards = await Contracts.milestoneControllerStorage.getUint(
    ThirdPartyJsConfig.default().Web3.utils.soliditySha3(
      projectHash,
      GLOBAL_MILESTONE_ID,
      CUMULATIVE_MAX_REGULATION_REWARDS))
  for (let i = 0; i < objMaxRegulationRewards.length; i++) {
    cumulativeMaxRewards = cumulativeMaxRewards.plus(objMaxRegulationRewards[i])
  }
  await Contracts.milestoneControllerStorage.setUint(
    ThirdPartyJsConfig.default().Web3.utils.soliditySha3(
      projectHash,
      GLOBAL_MILESTONE_ID,
      CUMULATIVE_MAX_REGULATION_REWARDS),
    cumulativeMaxRewards)

  /*
   * registerPollRequest
   */
  const objTypes = await Contracts.milestoneControllerStorage.getArray(
    ThirdPartyJsConfig.default().Web3.utils.soliditySha3(
      projectHash,
      milestoneId,
      OBJ_TYPES))
  const tokenAddress = await Contracts.projectController.getTokenAddress(projectHash)
  const avgPrice = await Contracts.tokenSale.avgPrice(projectHash)
  const pollId = ThirdPartyJsConfig.default().Web3.utils.soliditySha3(projectHash, milestoneId)
  /*
   * reputationSystem.registerPollRequest
   */
  await Contracts.reputationSystem.backdoorRegisterPollRequest (
    pollId,
    minStartTime,
    maxStartTime,
    avgPrice,
    true,
    tokenAddress,
    objTypes)

  /*
   * inside transfer from PROJECT_ETHER_BALANCE to MILESTONE_ETHER_WEILOCKED
   * PROJECT_ETHER_BALANCE will not changes
   */
  const milestoneEtherWeilockedKey = ThirdPartyJsConfig.default().Web3.utils.soliditySha3(
    projectHash,
    milestoneId,
    MILESTONE_ETHER_WEILOCKED)
  let balance = await Contracts.etherCollectorStorage.getUint(milestoneEtherWeilockedKey)
  balance = balance.plus(weiLocked)
  await Contracts.etherCollectorStorage.setUint(milestoneEtherWeilockedKey, balance)

  await ThirdPartyJsConfig.default().wweb3.eth.sendTransaction({
    from: defaultAccounts[0],
    to: Contracts.etherCollector.address,
    value: weiLocked
  })
}

export async function refundStage(Contracts, artifacts, projectName, milestoneId) {
  const projectHash = ThirdPartyJsConfig.default().wweb3.utils.keccak256(projectName)

  /*
   * Milestone Controller start refund stage
   */
  await Contracts.milestoneControllerStorage.setUint(
    ThirdPartyJsConfig.default().Web3.utils.soliditySha3(projectHash, milestoneId, STATE),
    OwnSolConfig.default(artifacts).MilestoneController.State.RP)
}

export async function finalizeMilestone(Contracts, artifacts, projectName, finalizeInfo) {
  const projectHash = ThirdPartyJsConfig.default().wweb3.utils.keccak256(projectName)
  const milestoneId = finalizeInfo.id
  const endTime = finalizeInfo.endTime

  /*
   * Milestone Controller to completion
   */
  await Contracts.milestoneControllerStorage.setUint(
    ThirdPartyJsConfig.default().Web3.utils.soliditySha3(projectHash, milestoneId, STATE),
    OwnSolConfig.default(artifacts).MilestoneController.State.COMPLETION)

  if (endTime !== 0) {
    await Contracts.milestoneControllerStorage.setUint(
      ThirdPartyJsConfig.default().Web3.utils.soliditySha3(projectHash, milestoneId, END_TIME),
      endTime)
  }
}

export async function refund(Contracts, artifacts, projectName, refundInfo) {
  const projectHash = ThirdPartyJsConfig.default().wweb3.utils.keccak256(projectName)
  const milestoneId = refundInfo.id
  const beneficiary = refundInfo.beneficiary
  const value = refundInfo.value
  const projectToken = refundInfo.token
  const availableTime = refundInfo.availableTime

  /*
   * TokenCollector deposit
   */
  await projectToken.transfer(Contracts.tokenCollector.address, value)
  const depositKey = ThirdPartyJsConfig.default().Web3.utils.soliditySha3(
    projectHash,
    PROJECT_TOKEN_BALANCE)
  let balance = await Contracts.tokenCollectorStorage.getUint(depositKey)
  balance = balance.plus(value)
  await Contracts.tokenCollectorStorage.setUint(depositKey, balance)

  /*
   * Set available time
   */
  await Contracts.refundManagerStorage.setUint(
    ThirdPartyJsConfig.default().Web3.utils.soliditySha3(
      projectHash,
      milestoneId,
      beneficiary,
      AVAILABLE_TIME),
    availableTime)

  /*
   * inside transfer to MILESTONE_ETHER_REFUND_LOCKED
   */
  const avg = await Contracts.tokenSale.avgPrice(projectHash)
  const etherAmount = (new BigNumber(value)).div(avg)

  await Contracts.etherCollectorStorage.setUint(
    ThirdPartyJsConfig.default().Web3.utils.soliditySha3(
      projectHash,
      milestoneId,
      beneficiary,
      MILESTONE_ETHER_REFUND_LOCKED),
    etherAmount)
}
