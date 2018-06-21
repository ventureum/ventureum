import {
  Token,
  VetXToken,
  Kernel,
  ACLHandler,
  ContractAddressHandler,
  RefundManager,
  ProjectController,
  MilestoneController,
  EtherCollector,
  TokenCollector,
  TokenSale,
  ReputationSystem,
  RegulatingRating,
  RewardManager,
  PaymentManager,
  Challenge,
  PLCRVoting,
  Parameterizer,
  Registry,
  CarbonVoteX} from './constants.js'

const Configuation = require('../config/configuation.js')

const run = exports.run = async (accounts) => {
  let instances = {}

  /* ---------------------Deploy Contracts--------------------------------- */
  /**
   * deploy token
   */
  instances.token = await Token.Self.new()

  /**
   * deploy VetXToken
   */
  instances.vetXToken = await VetXToken.Self.new(
    VetXToken.initAmount,
    VetXToken.tokenName,
    VetXToken.decimalUnits,
    VetXToken.tokenSymbol)

  /**
   * deploy kernel
   */
  instances.kernel = await Kernel.Self.new()

  /**
   * deploy handlers
   */
  // ACLHandler
  instances.aclHandler = await ACLHandler.Self.new(instances.kernel.address)

  // ContractAddressHandler
  instances.contractAddressHandler = await ContractAddressHandler.Self.new(
    instances.kernel.address)

  /**
   * deploy controllers
   */
  // Refund Manager
  instances.refundManager = await RefundManager.Self.new(
    instances.kernel.address)
  instances.refundManagerStorage = await RefundManager.Storage.Self.new(
    instances.kernel.address)

  /**
   * deploy controllers
   */
  // Project Controller
  instances.projectController = await ProjectController.Self.new(
    instances.kernel.address)
  instances.projectControllerStorage = await ProjectController.Storage.Self.new(
    instances.kernel.address)

  // Milestone Controller
  instances.milestoneController = await MilestoneController.Self.new(
    instances.kernel.address)
  instances.milestoneControllerStorage =
    await MilestoneController.Storage.Self.new(instances.kernel.address)

  // Ether Collector
  instances.etherCollector = await EtherCollector.Self.new(
    instances.kernel.address)
  instances.etherCollectorStorage = await EtherCollector.Storage.Self.new(
    instances.kernel.address)

  // Token Collector
  instances.tokenCollector = await TokenCollector.Self.new(
    instances.kernel.address)

  // Token Sale
  instances.tokenSale = await TokenSale.Self.new(instances.kernel.address)

  // Reward Manager
  instances.rewardManager = await RewardManager.Self.new(
    instances.kernel.address)
  instances.rewardManagerStorage = await RewardManager.Storage.Self.new(
    instances.kernel.address)

  // Payment Manager
  instances.paymentManager = await PaymentManager.Self.new(
    instances.kernel.address)
  instances.paymentManagerStorage = await PaymentManager.Storage.Self.new(
    instances.kernel.address)

  // Regulating Rating
  instances.regulatingRating = await RegulatingRating.Self.new(
    instances.kernel.address)
  instances.regulatingRatingStorage = await RegulatingRating.Storage.Self.new(
    instances.kernel.address)

  // CarbonVoteX
  instances.carbonVoteXCore = await CarbonVoteX.Core.new(accounts[0])

  // Reputation System
  instances.reputationSystem = await ReputationSystem.Self.new(
    instances.carbonVoteXCore.address,
    ReputationSystem.CI,
    ReputationSystem.updateInterval,
    ReputationSystem.prevVotesDiscount,
    ReputationSystem.newVotesDiscount,
    ReputationSystem.defaultAddressCanRegister)

  // Deploy VTCR
  instances.challenge = await Challenge.Self.new()
  instances.plcrVoting = await PLCRVoting.Self.new(
    instances.vetXToken.address
  )
  instances.parameterizer = await Parameterizer.Self.new(
    instances.vetXToken.address,
    instances.plcrVoting.address,
    Parameterizer.paramDefaults.minDeposit,
    Parameterizer.paramDefaults.pMinDeposit,
    Parameterizer.paramDefaults.applyStageLength,
    Parameterizer.paramDefaults.pApplyStageLength,
    Parameterizer.paramDefaults.commitStageLength,
    Parameterizer.paramDefaults.pCommitStageLength,
    Parameterizer.paramDefaults.revealStageLength,
    Parameterizer.paramDefaults.pRevealStageLength,
    Parameterizer.paramDefaults.dispensationPct,
    Parameterizer.paramDefaults.pDispensationPct,
    Parameterizer.paramDefaults.voteQuorum,
    Parameterizer.paramDefaults.pVoteQuorum)

  instances.registry = await Registry.Self.new(
    instances.kernel.address,
    instances.vetXToken.address,
    instances.plcrVoting.address,
    instances.parameterizer.address,
    instances.projectController.address
  )

  const instanceObjects = await Configuation.run(instances, accounts, artifacts)

  return instanceObjects
}
