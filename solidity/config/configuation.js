'use strict'

const ThirdPartySolConstants = require('../config/thirdPartySolConfig.js')
const OwnSolConstants = require('../config/ownSolConfig.js')

const run = exports.run = async (instances, accounts, artifacts) => {
  const root = accounts[0]

  /* ------- receive Constant -------- */
  const _thirdPartySolConstants = ThirdPartySolConstants.default(artifacts)
  const _ownSolConstants = OwnSolConstants.default(artifacts)

  /* ------- receive objects  -------- */
  // own solidity
  const Kernel = _ownSolConstants.Kernel
  const ACLHandler = _ownSolConstants.ACLHandler
  const ContractAddressHandler = _ownSolConstants.ContractAddressHandler
  const RefundManager = _ownSolConstants.RefundManager
  const ProjectController = _ownSolConstants.ProjectController
  const MilestoneController = _ownSolConstants.MilestoneController
  const EtherCollector = _ownSolConstants.EtherCollector
  const TokenCollector = _ownSolConstants.TokenCollector
  const TokenSale = _ownSolConstants.TokenSale
  const Storage = _ownSolConstants.Storage
  const RegulatingRating = _ownSolConstants.RegulatingRating
  const RewardManager = _ownSolConstants.RewardManager
  const PaymentManager = _ownSolConstants.PaymentManager
  const Registry = _ownSolConstants.Registry

  // third party solidity solidity
  const ReputationSystem = _thirdPartySolConstants.ReputationSystem
  const CarbonVoteX = _thirdPartySolConstants.CarbonVoteX


  /* ------- receive instances  -------- */
  // Token
  const vetXToken = instances.vetXToken

  // Kernel
  const kernel = instances.kernel

  // Register
  const registry = instances.registry

  // Handlers
  const aclHandler = instances.aclHandler
  const contractAddressHandler = instances.contractAddressHandler

  // Refund Manager
  const refundManager = instances.refundManager
  const refundManagerStorage = instances.refundManagerStorage

  // Project Controller
  const projectController = instances.projectController
  const projectControllerStorage = instances.projectControllerStorage

  // Milestone Controller
  const milestoneController = instances.milestoneController
  const milestoneControllerStorage = instances.milestoneControllerStorage

  // Ether Collector
  const etherCollector = instances.etherCollector
  const etherCollectorStorage = instances.etherCollectorStorage

  // Token Collector
  const tokenCollector = instances.tokenCollector

  // Token Sale
  const tokenSale = instances.tokenSale

  // Regulating Rating
  const regulatingRating = instances.regulatingRating
  const regulatingRatingStorage = instances.regulatingRatingStorage

  // Reward manager
  const rewardManager = instances.rewardManager
  const rewardManagerStorage = instances.rewardManagerStorage

  // Payment Manager
  const paymentManager = instances.paymentManager
  const paymentManagerStorage = instances.paymentManagerStorage

  // Reputation System
  const reputationSystem = instances.reputationSystem

  // CarbonVoteX
  const carbonVoteXCore = instances.carbonVoteXCore

  /* ---------------------Configuation CarbonVoteX----------------------------- */
  let functions = []
  for (let i = 0; i < accounts.length; i++) {
    functions.push(CarbonVoteX.sendGas)
  }
  await carbonVoteXCore.setReceiver(
    ReputationSystem.CI,
    reputationSystem.address,
    CarbonVoteX.receiverFunctions)

  await carbonVoteXCore.setPermissions(functions, accounts)

  /* ---------------------Kernel Register Handlers----------------------------- */
  // ACLHandler
  await kernel.registerHandler(ACLHandler.CI, aclHandler.address)

  // ContractAddressHandler
  await kernel.registerHandler(ContractAddressHandler.CI,
    contractAddressHandler.address)

  /* ---------------------Kernel Connect Handlers & Modules---- --------------- */
  /**
   * Kernel Connect handlers
   */
  // AclHandler
  await kernel.connect(aclHandler.address, [])

  // ContractAddressHandler
  await kernel.connect(contractAddressHandler.address, [])

  /**
   * Kernel Connect managers
   */
  // Refund Manager
  await kernel.connect(
    refundManager.address,
    [ACLHandler.CI, ContractAddressHandler.CI])
  await kernel.connect(
    refundManagerStorage.address,
    [ACLHandler.CI, ContractAddressHandler.CI])

  // RewardManager
  await kernel.connect(
    rewardManager.address,
    [ACLHandler.CI, ContractAddressHandler.CI])
  await kernel.connect(
    rewardManagerStorage.address,
    [ACLHandler.CI, ContractAddressHandler.CI])

  // PaymentManager
  await kernel.connect(
    paymentManager.address,
    [ACLHandler.CI, ContractAddressHandler.CI])
  await kernel.connect(
    paymentManagerStorage.address,
    [ACLHandler.CI, ContractAddressHandler.CI])

  /**
   * Kernel Connect controllers
   */
  // ProjectController
  await kernel.connect(
    projectController.address,
    [ACLHandler.CI, ContractAddressHandler.CI])
  await kernel.connect(
    projectControllerStorage.address,
    [ACLHandler.CI, ContractAddressHandler.CI])

  // MilestoneController
  await kernel.connect(
    milestoneController.address,
    [ACLHandler.CI, ContractAddressHandler.CI])
  await kernel.connect(
    milestoneControllerStorage.address,
    [ACLHandler.CI, ContractAddressHandler.CI])

  // EtherCollector
  await kernel.connect(
    etherCollector.address,
    [ACLHandler.CI, ContractAddressHandler.CI])
  await kernel.connect(
    etherCollectorStorage.address,
    [ACLHandler.CI, ContractAddressHandler.CI])

  // Registry
  await kernel.connect(
    registry.address,
    [ACLHandler.CI, ContractAddressHandler.CI])

  // TokenCollector
  await kernel.connect(
    tokenCollector.address,
    [ACLHandler.CI, ContractAddressHandler.CI])

  // RegulatingRating
  await kernel.connect(
    regulatingRating.address,
    [ACLHandler.CI, ContractAddressHandler.CI])
  await kernel.connect(
    regulatingRatingStorage.address,
    [ACLHandler.CI, ContractAddressHandler.CI])

  // TokenSale
  await kernel.connect(
    tokenSale.address,
    [ACLHandler.CI, ContractAddressHandler.CI])

  /* ---------------ContractAddressHandler Registers Contracts--------------- */
  /**
   * ContractAddressHandler Register Root
   */
  await contractAddressHandler.registerContract(Kernel.RootCI, root)

  /**
   * ContractAddressHandler Register managers
   */
  // Refund Manager
  await contractAddressHandler.registerContract(
    RefundManager.CI,
    refundManager.address)
  await contractAddressHandler.registerContract(
    RefundManager.Storage.CI,
    refundManagerStorage.address)

  /**
   * ContractAddressHandler Register controllers
   */
  // Project Controller
  await contractAddressHandler.registerContract(
    ProjectController.CI,
    projectController.address)
  await contractAddressHandler.registerContract(
    ProjectController.Storage.CI,
    projectControllerStorage.address)

  // Milestone Controller
  await contractAddressHandler.registerContract(
    MilestoneController.CI,
    milestoneController.address)
  await contractAddressHandler.registerContract(
    MilestoneController.Storage.CI,
    milestoneControllerStorage.address)

  // Ether Collector
  await contractAddressHandler.registerContract(
    EtherCollector.CI,
    etherCollector.address)
  await contractAddressHandler.registerContract(
    EtherCollector.Storage.CI,
    etherCollectorStorage.address)

  // Register
  await contractAddressHandler.registerContract(
    Registry.CI,
    registry.address)

  // Regulating Rating
  await contractAddressHandler.registerContract(
    RegulatingRating.CI,
    regulatingRating.address)
  await contractAddressHandler.registerContract(
    RegulatingRating.Storage.CI,
    regulatingRatingStorage.address)

  // Reward Manager
  await contractAddressHandler.registerContract(
    RewardManager.CI,
    rewardManager.address)
  await contractAddressHandler.registerContract(
    RewardManager.Storage.CI,
    rewardManagerStorage.address)

  // Payment Manager
  await contractAddressHandler.registerContract(
    PaymentManager.CI,
    paymentManager.address)
  await contractAddressHandler.registerContract(
    PaymentManager.Storage.CI,
    paymentManagerStorage.address)

  // Token Collector
  await contractAddressHandler.registerContract(
    TokenCollector.CI,
    tokenCollector.address)

  // Token Sale
  await contractAddressHandler.registerContract(
    TokenSale.CI,
    tokenSale.address)

  // Reputation System
  await contractAddressHandler.registerContract(
    ReputationSystem.CI,
    reputationSystem.address)

  /* -----------------------ACLHandler Grants permit ------------------------ */
  /**
   * Grant permits to Root
   */
  // Destination: Refund Manager
  await aclHandler.permit(
    Kernel.RootCI,
    RefundManager.CI,
    [RefundManager.Sig.SetStorage])

  // Destination: Project Controller
  await aclHandler.permit(
    Kernel.RootCI,
    ProjectController.CI,
    [
      ProjectController.Sig.RegisterProject,
      ProjectController.Sig.UnregisterProject,
      ProjectController.Sig.SetState,
      ProjectController.Sig.SetStorage,
      ProjectController.Sig.SetTokenAddress
    ])
  await aclHandler.permit(
    Kernel.RootCI,
    ProjectController.Storage.CI,
    [Storage.Sig.SetUint, Storage.Sig.SetAddress, Storage.Sig.SetBytes32])

  // Destination: Milestone Controller
  await aclHandler.permit(
    Kernel.RootCI,
    MilestoneController.CI,
    [
      MilestoneController.Sig.SetStorage,
      MilestoneController.Sig.SetRegulatingRating,
      MilestoneController.Sig.SetProjectController,
      MilestoneController.Sig.SetTokenSale,
      MilestoneController.Sig.SetReputationSystem,
      MilestoneController.Sig.AddMilestone
    ])
  await aclHandler.permit(
    Kernel.RootCI,
    MilestoneController.Storage.CI,
    [Storage.Sig.SetUint, Storage.Sig.SetArray])

  // Destination: Token Collector
  await aclHandler.permit(
    Kernel.RootCI,
    TokenCollector.CI,
    [TokenCollector.Sig.Withdraw, TokenCollector.Sig.Deposit])

  // Destination: Ether Collector
  await aclHandler.permit(
    Kernel.RootCI,
    EtherCollector.CI,
    [
      EtherCollector.Sig.SetStorage,
      EtherCollector.Sig.Deposit,
      EtherCollector.Sig.Withdraw
    ])
  await aclHandler.permit(
    Kernel.RootCI,
    EtherCollector.Storage.CI,
    [Storage.Sig.SetUint])

  // Destination: Regulating Rating
  await aclHandler.permit(
    Kernel.RootCI,
    RegulatingRating.CI,
    [
      RegulatingRating.Sig.Start,
      RegulatingRating.Sig.SetReputationSystem,
      RegulatingRating.Sig.SetProjectController,
      RegulatingRating.Sig.SetStorage
    ])
  await aclHandler.permit(
    RegulatingRating.CI,
    RegulatingRating.Storage.CI,
    [
      Storage.Sig.SetUint,
      Storage.Sig.SetBytes32,
      Storage.Sig.SetAddress,
      Storage.Sig.SetUintArray,
      Storage.Sig.SetBytes23Array,
      Storage.Sig.SetAddressArray
    ])

  // Destination: Reward Manager
  await aclHandler.permit(
    Kernel.RootCI,
    RewardManager.CI,
    [
      RewardManager.Sig.SetStorage
    ])
  await aclHandler.permit(
    RewardManager.CI,
    EtherCollector.CI,
    [EtherCollector.Sig.Withdraw])

  // Destination: Payment Manager
  await aclHandler.permit(
    Kernel.RootCI,
    PaymentManager.CI,
    [
      PaymentManager.Sig.SetStorage
    ])
  await aclHandler.permit(
    PaymentManager.CI,
    EtherCollector.CI,
    [EtherCollector.Sig.Withdraw])

  /**
   * Grant permits to managers
   */
  // Source: Refund Manager
  // Destination: Refund Manager Storage
  await aclHandler.permit(
    RefundManager.CI,
    RefundManager.Storage.CI,
    [Storage.Sig.SetUint])
  // Destination: Token Collector
  await aclHandler.permit(
    RefundManager.CI,
    TokenCollector.CI,
    [TokenCollector.Sig.Deposit])
  // Destination: Token Collector
  await aclHandler.permit(
    RefundManager.CI,
    EtherCollector.CI,
    [EtherCollector.Sig.Withdraw])

  /**
   * Grant permits to controllers
   */
  // Source: Project Controller
  // Destination: Project Controller Storage
  await aclHandler.permit(
    ProjectController.CI,
    ProjectController.Storage.CI,
    [Storage.Sig.SetUint, Storage.Sig.SetAddress, Storage.Sig.SetBytes32])

  // Source: Milestone Controller
  // Destination: Milestone Controller Storage
  await aclHandler.permit(
    MilestoneController.CI,
    MilestoneController.Storage.CI,
    [Storage.Sig.SetUint, Storage.Sig.SetArray, Storage.Sig.SetUintArray])

  // Source: Ether Collector
  // Destination: Ether Collector Storage
  await aclHandler.permit(
    EtherCollector.CI,
    EtherCollector.Storage.CI,
    [Storage.Sig.SetUint])

  // Source: Token Sale
  // Destination: Token Controller
  await aclHandler.permit(
    TokenSale.CI,
    TokenCollector.CI,
    [TokenCollector.Sig.Withdraw])

  // Registry
  await aclHandler.permit(
    Registry.CI,
    ProjectController.CI,
    [
      ProjectController.Sig.RegisterProject,
      ProjectController.Sig.UnregisterProject,
      ProjectController.Sig.SetState,
      ProjectController.Sig.SetTokenAddress
    ])

  /* ------------------------Set Storage------------------------- */
  /**
   * Set Storage for managers
   */
  // Refund Manager
  await refundManager.setStorage(refundManagerStorage.address)

  /**
   * Set Storage for controllers
   */
  // Project Controller
  await projectController.setStorage(projectControllerStorage.address)

  // Milestone Controller
  await milestoneController.setStorage(milestoneControllerStorage.address)

  // Ether Collector
  await etherCollector.setStorage(etherCollectorStorage.address)

  // Regulating Rating
  await regulatingRating.setStorage(regulatingRatingStorage.address)

  // Regulating Rating
  await rewardManager.setStorage(rewardManagerStorage.address)

  /* -------------------Set address can register -------------- */
  await reputationSystem.setAddressCanRegister(milestoneController.address)

  /* -------------------Milestone set controller-------------- */
  await milestoneController.setReputationSystem(reputationSystem.address)
  await milestoneController.setProjectController(projectController.address)
  await milestoneController.setTokenSale(tokenSale.address)

  /* -------------------Regulating Rating set controllers-------------- */
  await regulatingRating.setReputationSystem(reputationSystem.address)
  await regulatingRating.setProjectController(projectController.address)

  /* -------------------Managers Connected to Controllers-------------- */
  // Refund Manager
  contractAddressHandler.connect(
    refundManager.address,
    [
      ProjectController.CI,
      MilestoneController.CI,
      TokenSale.CI,
      TokenCollector.CI,
      EtherCollector.CI
    ])

  /* -----------------------Return------------------------------------------- */
  return {
    vetXToken,
    kernel,
    aclHandler,
    contractAddressHandler,
    refundManager,
    refundManagerStorage,
    projectController,
    projectControllerStorage,
    milestoneController,
    milestoneControllerStorage,
    etherCollector,
    etherCollectorStorage,
    tokenCollector,
    tokenSale,
    carbonVoteXCore,
    reputationSystem,
    paymentManager,
    paymentManagerStorage,
    regulatingRating,
    regulatingRatingStorage,
    registry
  }
}
