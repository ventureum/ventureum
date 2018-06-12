'use strict'

const Constant = require('../config/config.js')
const Configuation = require('../config/configuation.js')

// Get Constant
const _contants = Constant.default(artifacts)

//* Token
const VetXToken = _contants.VetXToken

//* SafeMath
const SafeMath = _contants.SafeMath

//* Kernel
const Kernel = _contants.Kernel

//* Handlers
const ACLHandler = _contants.ACLHandler
const ContractAddressHandler = _contants.ContractAddressHandler

//* Module
// * Manager
const RefundManager = _contants.RefundManager

// * Controllers
const ProjectController = _contants.ProjectController
const MilestoneController = _contants.MilestoneController

// * Collectors
const EtherCollector = _contants.EtherCollector
const TokenCollector = _contants.TokenCollector

// * Token sale
const TokenSale = _contants.TokenSale

module.exports = function (deployer) {
  function migrationDeploy () {
    let instances = {}

    deployer.deploy(SafeMath.Self).then(function () {
      return deployer.link(
        SafeMath.Self,
        [EtherCollector.Self,
          RefundManager.Self,
          MilestoneController.Self,
          TokenSale.Self])
    }).then(async function () {
      // Deploy kernel
      await deployer.deploy(Kernel.Self)

      // Deploy token
      await deployer.deploy(
        VetXToken.Self,
        '1000000000000000000',
        'VetX',
        18,
        'VTX')

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

      // Deploy token collector
      await deployer.deploy(TokenCollector.Self, Kernel.Self.address)

      // Deploy token sale
      await deployer.deploy(TokenSale.Self, Kernel.Self.address)

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

      // Configuration
      await Configuation.run(instances, web3.eth.accounts, artifacts)
    })
  }
  migrationDeploy()
}
