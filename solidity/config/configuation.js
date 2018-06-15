'use strict'

const Constant = require('../config/config.js')

const run = exports.run = async (instances, accounts, artifacts) => {
  const root = accounts[0]

  /* ------- receive Constant -------- */
  const _constants = Constant.default(artifacts)

  /* ------- receive objects  -------- */
  const Kernel = _constants.Kernel
  const ACLHandler = _constants.ACLHandler
  const ContractAddressHandler = _constants.ContractAddressHandler
  const RefundManager = _constants.RefundManager
  const ProjectController = _constants.ProjectController
  const MilestoneController = _constants.MilestoneController
  const EtherCollector = _constants.EtherCollector
  const TokenCollector = _constants.TokenCollector
  const TokenSale = _constants.TokenSale
  const Storage = _constants.Storage
  const ReputationSystem = _constants.ReputationSystem
  const CarbonVoteX = _constants.CarbonVoteX

  /* ------- receive instances  -------- */
  // Token
  const token = instances.token
  const vetXToken = instances.vetXToken

  // Kernel
  const kernel = instances.kernel

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

  // Reputation System
  const reputationSystem = instances.reputationSystem

  // CarbonVoteX
  const carbonVoteXCore = instances.carbonVoteXCore
  const carbonVoteXBasic = instances.carbonVoteXBasic

  /* ---------------------Configuation CarbonVoteX----------------------------- */
  let functions = []
  for (let i = 0; i < accounts.length; i++) {
    functions.push(CarbonVoteX.sendGas)
  }
  await carbonVoteXCore.setReceiver(
    CarbonVoteX.NAME_SPACE,
    carbonVoteXBasic.address,
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

  // TokenCollector
  await kernel.connect(
    tokenCollector.address,
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

  /* -------------------Set address can register -------------- */
  await reputationSystem.setAddressCanRegister(milestoneController.address)

  /* -------------------Milestone set controller-------------- */
  await milestoneController.setReputationSystem(reputationSystem.address)
  await milestoneController.setProjectController(projectController.address)
  await milestoneController.setTokenSale(tokenSale.address)

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
    token,
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
    reputationSystem
  }
}
