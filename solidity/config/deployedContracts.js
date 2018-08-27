'use strict'

const rootDir = '../'

const OwnSolConfig = require(rootDir + 'config/ownSolConfig.js')
const ThirdPartySolConfig = require(rootDir + 'config/thirdPartySolConfig.js')

const getContracts = exports.getContracts = async (artifacts) => {
  // get artifacts
  const _ownSolConstants = OwnSolConfig.default(artifacts)
  const _thirdPartySolConstants = ThirdPartySolConfig.default(artifacts)

  /*
   * All contracts:
   */
  //* VTCR
  const PLCRVoting = _ownSolConstants.PLCRVoting
  const Challenge = _ownSolConstants.Challenge
  const Parameterizer = _ownSolConstants.Parameterizer
  const Registry = _ownSolConstants.Registry

  //* Modules
  const RefundManager = _ownSolConstants.RefundManager
  const RewardManager = _ownSolConstants.RewardManager
  const ProjectController = _ownSolConstants.ProjectController
  const MilestoneController = _ownSolConstants.MilestoneController
  const EtherCollector = _ownSolConstants.EtherCollector
  const TokenCollector = _ownSolConstants.TokenCollector
  const RegulatingRating = _ownSolConstants.RegulatingRating
  const TokenSale = _ownSolConstants.TokenSale

  // CarbonVoteX system (with reputation system)
  const ReputationSystem = _thirdPartySolConstants.ReputationSystem
  const CarbonVoteX = _thirdPartySolConstants.CarbonVoteX

  // Tokens
  const VetXToken = _thirdPartySolConstants.VetXToken
  const MockProjectToken1 = _ownSolConstants.MockProjectToken1
  const MockProjectToken2 = _ownSolConstants.MockProjectToken2
  const MockProjectToken3 = _ownSolConstants.MockProjectToken3
  const MockProjectToken4 = _ownSolConstants.MockProjectToken4


  /*
   * contracts
   */
  class Contracts {}

  // Tokens
  Contracts.vetXToken = await VetXToken.Self.deployed()
  Contracts.mockProjectToken1 = await MockProjectToken1.Self.deployed()
  Contracts.mockProjectToken2 = await MockProjectToken2.Self.deployed()
  Contracts.mockProjectToken3 = await MockProjectToken3.Self.deployed()
  Contracts.mockProjectToken4 = await MockProjectToken4.Self.deployed()

  // VTCR
  Contracts.registry = await Registry.Self.deployed()
  Contracts.plcrVoting = await PLCRVoting.Self.deployed()

  // Modules with storage
  Contracts.projectController = await ProjectController.Self.deployed()
  Contracts.projectControllerStorage = await ProjectController.Storage.Self.deployed()

  Contracts.milestoneController = await MilestoneController.Self.deployed()
  Contracts.milestoneControllerStorage = await MilestoneController.Storage.Self.deployed()
  Contracts.milestoneControllerView = await MilestoneController.View.Self.deployed()
  Contracts.tokenCollector = await TokenCollector.Self.deployed()
  Contracts.tokenCollectorStorage = await TokenCollector.Storage.Self.deployed()

  Contracts.tokenSale = await TokenSale.Self.deployed()
  Contracts.tokenSaleStorage = await TokenSale.Storage.Self.deployed()

  Contracts.regulatingRating = await RegulatingRating.Self.deployed()
  Contracts.regulatingRatingStorage = await RegulatingRating.Storage.Self.deployed()

  Contracts.etherCollector = await EtherCollector.Self.deployed()
  Contracts.etherCollectorStorage = await EtherCollector.Storage.Self.deployed()

  Contracts.rewardManager = await RewardManager.Self.deployed()
  Contracts.rewardManagerStorage = await RewardManager.Storage.Self.deployed()

  Contracts.refundManager = await RefundManager.Self.deployed()
  Contracts.refundManagerStorage = await RefundManager.Storage.Self.deployed()

  Contracts.carbonVoteXCore = await CarbonVoteX.Core.deployed()

  Contracts.reputationSystem = await ReputationSystem.Self.deployed()


  return Contracts
}
