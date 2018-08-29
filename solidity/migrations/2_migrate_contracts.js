'use strict'

const OwnSolConfig = require('../config/ownSolConfig.js')
const ThirdPartySolConfig = require('../config/thirdPartySolConfig.js')
const ThirdPartyJsConfig = require('../config/thirdPartyJsConfig.js')

const Configuration = require('../config/configuration.js')
const MigrationConfiguration = require('../config/migrationConfiguration.js')

const duration = require('openzeppelin-solidity/test/helpers/increaseTime').duration

// Get Constant
const _ownSolConstants = OwnSolConfig.default(artifacts)
const _thirdPartySolConstants = ThirdPartySolConfig.default(artifacts)
const _thirdPartyJsConstants = ThirdPartyJsConfig.default()

// Own contracts:
//* VTCR
const Library = _ownSolConstants.Library
const PLCRVoting = _ownSolConstants.PLCRVoting
const Challenge = _ownSolConstants.Challenge
const Parameterizer = _ownSolConstants.Parameterizer
const Registry = _ownSolConstants.Registry

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

// * Mock project token
const MockProjectToken1 = _ownSolConstants.MockProjectToken1
const MockProjectToken2 = _ownSolConstants.MockProjectToken2
const MockProjectToken3 = _ownSolConstants.MockProjectToken3
const MockProjectToken4 = _ownSolConstants.MockProjectToken4
const MockProjectTokenInfo = _ownSolConstants.MockProjectTokenInfo

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

// * Conversion
const Conversion = _thirdPartySolConstants.Conversion

//* Kernel
const Kernel = _thirdPartySolConstants.Kernel

//* Handlers
const ACLHandler = _thirdPartySolConstants.ACLHandler
const ContractAddressHandler = _thirdPartySolConstants.ContractAddressHandler


module.exports = function (deployer, network, accounts) {
  function migrationDeploy () {
    let instances = {}

    deployer.deploy(SafeMath.Self).then(function () {
      return deployer.link(
        SafeMath.Self,
        [EtherCollector.Self,
          RefundManager.Self,
          MilestoneController.Self,
          MilestoneController.View.Self,
          RegulatingRating.Self,
          PLCRVoting.Self,
          Challenge.Self,
          Registry.Self,
          Presale.Self,
          Parameterizer.Self])
    }).then(async function () {

      // deploy Conversion and linked to Library.DLL
      await deployer.deploy(Conversion.Self)
      await deployer.link(Conversion.Self, [Library.DLL])

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
        Parameterizer.paramDefaults.applyStageLength,
        Parameterizer.paramDefaults.commitStageLength,
        Parameterizer.paramDefaults.revealStageLength,
        Parameterizer.paramDefaults.dispensationPct,
        Parameterizer.paramDefaults.voteQuorum)

      // Deploy acl handler
      await deployer.deploy(ACLHandler.Self, Kernel.Self.address)

      // Deploy contract address handler
      await deployer.deploy(ContractAddressHandler.Self, Kernel.Self.address)

      // Deploy refund Manager and Storage
      await deployer.deploy(
        RefundManager.Self,
        Kernel.Self.address,
        RefundManager.refundDuration)
      await deployer.deploy(RefundManager.Storage.Self, Kernel.Self.address)

      // Deploy project controller and storage
      await deployer.deploy(ProjectController.Self, Kernel.Self.address)
      await deployer.deploy(ProjectController.Storage.Self, Kernel.Self.address)

      // Deploy milestone controller and storage and view
      await deployer.deploy(
        MilestoneController.Self,
        Kernel.Self.address,
        MilestoneController.minMilestoneLength,
        MilestoneController.ratingStageMaxStartTimeFromEnd,
        MilestoneController.ratingStageMinStartTimeFromBegin,
        MilestoneController.refundStageMinStartTimeFromEnd)
      await deployer.deploy(
        MilestoneController.Storage.Self,
        Kernel.Self.address)
      await deployer.deploy(
        MilestoneController.View.Self,
        MilestoneController.Storage.Self.address,
        MilestoneController.Self.address)

      // Deploy token sale and storage
      await deployer.deploy(
        TokenSale.Self,
        Kernel.Self.address,
        TokenSale.VTX_BASE,
        VetXToken.Self.address)
      await deployer.deploy(TokenSale.Storage.Self, Kernel.Self.address)

      // Deploy token collector and storage
      await deployer.deploy(TokenCollector.Self, Kernel.Self.address)
      await deployer.deploy(TokenCollector.Storage.Self, Kernel.Self.address)

      // Deploy ether collector and storage
      await deployer.deploy(EtherCollector.Self, Kernel.Self.address)
      await deployer.deploy(EtherCollector.Storage.Self, Kernel.Self.address)

      // Deploy ether regulating rating and storage
      await deployer.deploy(
        RegulatingRating.Self,
        Kernel.Self.address,
        RegulatingRating.MaxScore)
      await deployer.deploy(RegulatingRating.Storage.Self, Kernel.Self.address)
      await deployer.deploy(
        RegulatingRating.View.Self,
        RegulatingRating.Self.address,
        RegulatingRating.Storage.Self.address)

      // Deploy ether reward manager and storage
      await deployer.deploy(RewardManager.Self, Kernel.Self.address)
      await deployer.deploy(RewardManager.Storage.Self, Kernel.Self.address)

      // Deploy ether payment manager and storage
      await deployer.deploy(PaymentManager.Self, Kernel.Self.address)
      await deployer.deploy(PaymentManager.Storage.Self, Kernel.Self.address)

      // Deploy carbon vote x
      await deployer.deploy(CarbonVoteXCore, accounts[0])

      // Deploy Mock Project Token
      await deployer.deploy(MockProjectToken1.Self, MockProjectTokenInfo.initialSupply)
      await deployer.deploy(MockProjectToken2.Self, MockProjectTokenInfo.initialSupply)
      await deployer.deploy(MockProjectToken3.Self, MockProjectTokenInfo.initialSupply)
      await deployer.deploy(MockProjectToken4.Self, MockProjectTokenInfo.initialSupply)

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
      const startTime= (await _thirdPartyJsConstants.wweb3.eth.getBlock('latest')).timestamp + duration.weeks(1)
      const endTime= (await _thirdPartyJsConstants.wweb3.eth.getBlock('latest')).timestamp + duration.weeks(2)
      await deployer.deploy(
        Presale.Self,
        accounts[0],
        VetXToken.Self.address,
        startTime,
        endTime)

      // Instances
      instances.vetXToken = VetXToken.Self.at(VetXToken.Self.address)

      /*
       * VTCR
       */
      instances.kernel = Kernel.Self.at(Kernel.Self.address)
      instances.aclHandler = ACLHandler.Self.at(ACLHandler.Self.address)
      instances.contractAddressHandler = ContractAddressHandler.Self.at(
        ContractAddressHandler.Self.address)
      instances.registry = Registry.Self.at(
        Registry.Self.address)

      /*
       * managers
       */
      instances.refundManager = RefundManager.Self.at(
        RefundManager.Self.address)
      instances.refundManagerStorage = RefundManager.Storage.Self.at(
        RefundManager.Storage.Self.address)

      instances.rewardManager = RewardManager.Self.at(
        RewardManager.Self.address)
      instances.rewardManagerStorage = RewardManager.Storage.Self.at(
        RewardManager.Storage.Self.address)

      instances.paymentManager = PaymentManager.Self.at(
        PaymentManager.Self.address)
      instances.paymentManagerStorage = PaymentManager.Storage.Self.at(
        PaymentManager.Storage.Self.address)

      /*
       * project controller
       */
      instances.projectController = ProjectController.Self.at(
        ProjectController.Self.address)
      instances.projectControllerStorage = ProjectController.Storage.Self.at(
        ProjectController.Storage.Self.address)

      /*
       * Milestone Controller
       */
      instances.milestoneController = MilestoneController.Self.at(
        MilestoneController.Self.address)
      instances.milestoneControllerStorage =
        MilestoneController.Storage.Self.at(MilestoneController.Storage.Self.address)
      instances.milestoneControllerView =
        MilestoneController.View.Self.at(MilestoneController.View.Self.address)

      /*
       * collectors and their storage
       */
      instances.etherCollector = EtherCollector.Self.at(
        EtherCollector.Self.address)
      instances.etherCollectorStorage = EtherCollector.Storage.Self.at(
        EtherCollector.Storage.Self.address)

      instances.tokenCollector = TokenCollector.Self.at(
        TokenCollector.Self.address)
      instances.tokenCollectorStorage = TokenCollector.Storage.Self.at(
        TokenCollector.Storage.Self.address)

      // token sale
      instances.tokenSale = TokenSale.Self.at(TokenSale.Self.address)
      instances.tokenSaleStorage = TokenSale.Storage.Self.at(TokenSale.Storage.Self.address)

      // regulating rating
      instances.regulatingRating = RegulatingRating.Self.at(
        RegulatingRating.Self.address)
      instances.regulatingRatingStorage = RegulatingRating.Storage.Self.at(
        RegulatingRating.Storage.Self.address)
      instances.regulatingRatingView = RegulatingRating.View.Self.at(
        RegulatingRating.View.Self.address)

      // Third party repo
      instances.reputationSystem = ReputationSystem.Self.at(
        ReputationSystem.Self.address)
      instances.carbonVoteXCore = CarbonVoteXCore.at(
        CarbonVoteXCore.address)

      // Configuration
      await Configuration.run(instances, accounts, artifacts)
      await MigrationConfiguration.initMockData(instances, accounts, artifacts)

      const presale = Presale.Self.at(Presale.Self.address)
      const vetXToken = VetXToken.Self.at(VetXToken.Self.address)

      // Note: the VetXToken owner (which is ROOT) auto transfer half
      // of his vtx to Presale contract
      const bal = await vetXToken.balanceOf(accounts[0])
      await vetXToken.transfer(presale.address, bal / 2)
      const presaleBal = await vetXToken.balanceOf(presale.address)
    })
  }
  migrationDeploy()
}
