'use strict'

const OwnSolConfig = require('../config/ownSolConfig.js')
const ThirdPartySolConfig = require('../config/thirdPartySolConfig.js')

const Configuation = require('../config/configuation.js')
const MigrationConfiguation = require('../config/migrationConfiguation.js')

const duration = require('openzeppelin-solidity/test/helpers/increaseTime').duration

// Get Constant
const _ownSolConstants = OwnSolConfig.default(artifacts)
const _thirdPartySolConstants = ThirdPartySolConfig.default(artifacts)

// Own contracts:
//* VTCR
const Library = _ownSolConstants.Library
const PLCRVoting = _ownSolConstants.PLCRVoting
const Challenge = _ownSolConstants.Challenge
const Parameterizer = _ownSolConstants.Parameterizer
const Registry = _ownSolConstants.Registry

//* Kernel
const Kernel = _ownSolConstants.Kernel

//* Handlers
const ACLHandler = _ownSolConstants.ACLHandler
const ContractAddressHandler = _ownSolConstants.ContractAddressHandler

//* Module
// * Manager
const RefundManager = _ownSolConstants.RefundManager
const RewardManager = _ownSolConstants.RewardManager
const PaymentManager = _ownSolConstants.PaymentManager

// * Controllers
const ProjectController = _ownSolConstants.ProjectController
const MilestoneController = _ownSolConstants.MilestoneController

// * Collectors
const EtherCollector = _ownSolConstants.EtherCollector
const TokenCollector = _ownSolConstants.TokenCollector

// * RegulatingRating
const RegulatingRating = _ownSolConstants.RegulatingRating

// * Token sale
const TokenSale = _ownSolConstants.TokenSale

// third party contracts:
//* Token
const VetXToken = _thirdPartySolConstants.VetXToken

//* SafeMath
const SafeMath = _thirdPartySolConstants.SafeMath

// * Reputation System
const ReputationSystem = _thirdPartySolConstants.ReputationSystem

// * CarbonVoteX Core
const CarbonVoteXCore = _thirdPartySolConstants.CarbonVoteX.Core
const CarbonVoteXNameSpace = _thirdPartySolConstants.NAME_SPACE

// * Presale
const Presale = _thirdPartySolConstants.Presale

module.exports = function (deployer, network, accounts) {
  function migrationDeploy () {
    let instances = {}

    deployer.deploy(SafeMath.Self).then(function () {
      return deployer.link(
        SafeMath.Self,
        [EtherCollector.Self,
          RefundManager.Self,
          MilestoneController.Self,
          RegulatingRating.Self,
          PLCRVoting.Self,
          Challenge.Self,
          Registry.Self,
          Presale.Self,
          Parameterizer.Self])
    }).then(async function () {
      // Deploy kernel
      await deployer.deploy(Kernel.Self)

      // Deploy token
      await deployer.deploy(
        VetXToken.Self,
        VetXToken.initAmount,
        VetXToken.tokenName,
        VetXToken.decimalUnits,
        VetXToken.tokenSymbol)

      //*  Deploy VTCR
      // Deploy Library
      await deployer.deploy(Library.DLL)
      await deployer.deploy(Library.DLLBytes32)
      await deployer.deploy(Library.AttributeStore)
      await deployer.link(
        Library.DLL,
        [PLCRVoting.Self])
      await deployer.link(
        Library.AttributeStore,
        [PLCRVoting.Self])
      await deployer.link(
        Library.DLLBytes32,
        [Registry.Self])

      // Deploy Challenge
      await deployer.deploy(Challenge.Self)
      await deployer.link(
        Challenge.Self,
        [Parameterizer.Self,
        Registry.Self])

      // Deploy PLCRVoting
      await deployer.deploy(
        PLCRVoting.Self,
        VetXToken.Self.address)

      // Deploy Parameterizer
      await deployer.deploy(
        Parameterizer.Self,
        VetXToken.Self.address,
        PLCRVoting.Self.address,
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

      // Deploy acl handler
      await deployer.deploy(ACLHandler.Self, Kernel.Self.address)

      // Deploy contract address handler
      await deployer.deploy(ContractAddressHandler.Self, Kernel.Self.address)

      // Deploy refund Manager
      await deployer.deploy(RefundManager.Self, Kernel.Self.address)

      // Deploy refund Manager Storage
      await deployer.deploy(RefundManager.Storage.Self, Kernel.Self.address)

      // Deploy project controller
      await deployer.deploy(ProjectController.Self, Kernel.Self.address)

      // Deploy project controller storage
      await deployer.deploy(ProjectController.Storage.Self, Kernel.Self.address)

      // Deploy milestone controller
      await deployer.deploy(MilestoneController.Self, Kernel.Self.address)

      // Deploy milestone controller storage
      await deployer.deploy(
        MilestoneController.Storage.Self,
        Kernel.Self.address)

      // Deploy ether collector
      await deployer.deploy(EtherCollector.Self, Kernel.Self.address)

      // Deploy ether collector storage
      await deployer.deploy(EtherCollector.Storage.Self, Kernel.Self.address)

      // Deploy ether regulating rating
      await deployer.deploy(RegulatingRating.Self, Kernel.Self.address)

      // Deploy ether regulating rating storage
      await deployer.deploy(RegulatingRating.Storage.Self, Kernel.Self.address)

      // Deploy ether reward manager
      await deployer.deploy(RewardManager.Self, Kernel.Self.address)

      // Deploy ether reward manager storage
      await deployer.deploy(RewardManager.Storage.Self, Kernel.Self.address)

      // Deploy ether payment manager
      await deployer.deploy(PaymentManager.Self, Kernel.Self.address)

      // Deploy ether payment manager storage
      await deployer.deploy(PaymentManager.Storage.Self, Kernel.Self.address)

      // Deploy token collector
      await deployer.deploy(TokenCollector.Self, Kernel.Self.address)

      // Deploy token sale
      await deployer.deploy(TokenSale.Self, Kernel.Self.address)

      // Deploy carbon vote x
      await deployer.deploy(CarbonVoteXCore, accounts[0])

      // Deploy reputation system
      await deployer.deploy(
        ReputationSystem.Self,
        CarbonVoteXCore.address,
        ReputationSystem.CI,
        ReputationSystem.updateInterval,
        ReputationSystem.prevVotesDiscount,
        ReputationSystem.newVotesDiscount,
        ReputationSystem.defaultAddressCanRegister)

      // Deploy Registry
      await deployer.deploy(
        Registry.Self,
        Kernel.Self.address,
        VetXToken.Self.address,
        PLCRVoting.Self.address,
        Parameterizer.Self.address,
        ProjectController.Self.address)

      // Deploy Registry
      const startTime = web3.eth.getBlock('latest').timestamp + duration.weeks(1)
      const endTime = web3.eth.getBlock('latest').timestamp + duration.weeks(2)
      await deployer.deploy(
        Presale.Self,
        accounts[0],
        VetXToken.Self.address,
        startTime,
        endTime)

      // Instances
      instances.vetXToken = VetXToken.Self.at(VetXToken.Self.address)
      instances.kernel = Kernel.Self.at(Kernel.Self.address)
      instances.aclHandler = ACLHandler.Self.at(ACLHandler.Self.address)
      instances.contractAddressHandler = ContractAddressHandler.Self.at(
        ContractAddressHandler.Self.address)
      instances.refundManager = RefundManager.Self.at(
        RefundManager.Self.address)
      instances.refundManagerStorage = RefundManager.Storage.Self.at(
        RefundManager.Storage.Self.address)
      instances.projectController = ProjectController.Self.at(
        ProjectController.Self.address)
      instances.milestoneController = MilestoneController.Self.at(
        MilestoneController.Self.address)
      instances.etherCollector = EtherCollector.Self.at(
        EtherCollector.Self.address)
      instances.tokenCollector = TokenCollector.Self.at(
        TokenCollector.Self.address)
      instances.tokenSale = TokenSale.Self.at(TokenSale.Self.address)
      instances.projectControllerStorage = ProjectController.Storage.Self.at(
        ProjectController.Storage.Self.address)
      instances.milestoneControllerStorage =
        MilestoneController.Storage.Self.at(
          MilestoneController.Storage.Self.address)
      instances.etherCollectorStorage = EtherCollector.Storage.Self.at(
        EtherCollector.Storage.Self.address)
      instances.reputationSystem = ReputationSystem.Self.at(
        ReputationSystem.Self.address)
      instances.carbonVoteXCore = CarbonVoteXCore.at(
        CarbonVoteXCore.address)
      instances.regulatingRating = RegulatingRating.Self.at(
        RegulatingRating.Self.address)
      instances.regulatingRatingStorage = RegulatingRating.Storage.Self.at(
        RegulatingRating.Storage.Self.address)
      instances.rewardManager = RewardManager.Self.at(
        RewardManager.Self.address)
      instances.rewardManagerStorage = RewardManager.Storage.Self.at(
        RewardManager.Storage.Self.address)
      instances.paymentManager = PaymentManager.Self.at(
        PaymentManager.Self.address)
      instances.paymentManagerStorage = PaymentManager.Storage.Self.at(
        PaymentManager.Storage.Self.address)
      instances.registry = Registry.Self.at(
        Registry.Self.address)

      // Configuration
      await Configuation.run(instances, accounts, artifacts)
      await MigrationConfiguation.initMockData(instances, accounts, artifacts)
    })
  }
  migrationDeploy()
}
