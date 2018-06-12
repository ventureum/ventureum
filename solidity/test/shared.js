import {
  Token,
  Kernel,
  ACLHandler,
  ContractAddressHandler,
  RefundManager,
  ProjectController,
  MilestoneController,
  EtherCollector,
  TokenCollector,
  TokenSale} from './constants.js'

const Configuation = require('../config/configuation.js')

const run = exports.run = async (accounts) => {
  let instances = {}

  /* ---------------------Deploy Contracts--------------------------------- */
  /**
   * deploy token
   */
  instances.token = await Token.Self.new()

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

  const instanceObjects = await Configuation.run(instances, accounts, artifacts)

  return instanceObjects
}