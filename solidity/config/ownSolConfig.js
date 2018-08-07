const rootDir = '../'

const ThirdPartyJsConfig = require(rootDir + "config/thirdPartyJsConfig.js")

const toWei = function (num) {
  return num.toString() + '0'.repeat(18)
}

export default function (artifacts) {
  const _thirdPartyJsConstants = ThirdPartyJsConfig.default()

  const wweb3 = _thirdPartyJsConstants.wweb3
  const Web3 = _thirdPartyJsConstants.Web3

  const SET_STORAGE_SIG = wweb3.eth.abi.encodeFunctionSignature(
    'setStorage(address)')
  const SET_REPUTATION_SYSTEM = wweb3.eth.abi.encodeFunctionSignature(
    'setReputationSystem(address)')
  const SET_PROJECT_CONTROLLER = wweb3.eth.abi.encodeFunctionSignature(
    'setProjectController(address)')

  /* ---------------------Contracts-------------------------------------------- */
  /**
   * VTCR Contracts
   */
  // Library
  class Library {}
  Library.DLL = artifacts.require('libaray/DLL')
  Library.AttributeStore = artifacts.require('libaray/AttributeStore')
  Library.DLLBytes32 = artifacts.require('libaray/DLLBytes32')

  // PLCRVoting
  class PLCRVoting {}
  PLCRVoting.Self = artifacts.require('modules/VTCR/PLCRVoting')

  // Challenge
  class Challenge {}
  Challenge.Self = artifacts.require('modules/VTCR/Challenge')

  // Parameterizer
  class Parameterizer {}
  Parameterizer.Self = artifacts.require('modules/VTCR/Parameterizer')
  Parameterizer.paramDefaults = {
    "minDeposit": toWei(50000),
    "pMinDeposit": toWei(50000),
    "applyStageLength": 300,
    "pApplyStageLength": 60,
    "commitStageLength": 60,
    "pCommitStageLength": 60,
    "revealStageLength": 60,
    "pRevealStageLength": 120,
    "dispensationPct": 50,
    "pDispensationPct": 50,
    "voteQuorum": 50,
    "pVoteQuorum": 50,
    "initialTokenPurchase": toWei(100000000)
  }

  // Registry
  class Registry {}
  Registry.Self = artifacts.require('modules/VTCR/Registry')
  Registry.CI = Web3.utils.keccak256('Registry')

  /**
   * Contracts - managers
   */
  // RefundManager
  class RefundManager {}
  RefundManager.Self = artifacts.require(
    'modules/managers/refund_manager/RefundManager')
  RefundManager.CI = Web3.utils.keccak256('RefundManager')
  RefundManager.Sig = {
    SetStorage: SET_STORAGE_SIG}
  RefundManager.Storage = {
    Self: artifacts.require(
      'modules/managers/refund_manager/RefundManagerStorage'),
    CI: Web3.utils.keccak256('RefundManagerStorage')
  }

  // Reward Manager
  class RewardManager {}
  RewardManager.Self = artifacts.require('./RewardManager')
  RewardManager.CI = Web3.utils.keccak256('RewardManager')
  RewardManager.Sig = {
    SetStorage: SET_STORAGE_SIG
  }
  RewardManager.Storage = {
    Self: artifacts.require(
      'modules/managers/reward_manager/RewardManagerStorage'),
    CI: Web3.utils.keccak256('RewardManagerStorage')
  }

  // Payment Manager
  class PaymentManager {}
  PaymentManager.Self = artifacts.require('./PaymentManager')
  PaymentManager.CI = Web3.utils.keccak256('PaymentManager')
  PaymentManager.Sig = {
    SetStorage: SET_STORAGE_SIG
  }
  PaymentManager.Storage = {
    Self: artifacts.require(
      'modules/managers/payment_manager/PaymentManagerStorage'),
    CI: Web3.utils.keccak256('PaymentManagerStorage')
  }

  /**
   * Contracts - controllers
   */
  // Project Controller
  class ProjectController {}
  ProjectController.Self = artifacts.require(
    'modules/project_controller/ProjectController')
  ProjectController.CI = Web3.utils.keccak256('ProjectController')
  ProjectController.Sig = {
    RegisterProject: wweb3.eth.abi.encodeFunctionSignature(
      'registerProject(bytes32,address,address)'),
    UnregisterProject: wweb3.eth.abi.encodeFunctionSignature(
      'unregisterProject(bytes32)'),
    SetState: wweb3.eth.abi.encodeFunctionSignature(
      'setState(bytes32,uint256)'),
    SetStorage: SET_STORAGE_SIG,
    SetTokenAddress: wweb3.eth.abi.encodeFunctionSignature(
      'setTokenAddress(bytes32,address)')
  }
  ProjectController.Storage = {
    Self: artifacts.require(
      'modules/project_controller/ProjectControllerStorage'),
    CI: Web3.utils.keccak256('ProjectControllerStorage')
  }
  ProjectController.State = {
    NotExist: 0,
    AppSubmitted: 1,
    AppAccepted: 2,
    TokenSale: 3,
    Milestone: 4,
    Complete: 5,
    LENGTH: 6,
  }

  // Milestone Controller
  class MilestoneController {}
  MilestoneController.Self = artifacts.require(
    'modules/milestone_controller/MilestoneController')
  MilestoneController.CI = Web3.utils.keccak256('MilestoneController')
  MilestoneController.Sig = {
    RegisterProject: wweb3.eth.abi.encodeFunctionSignature(
      'registerProject(bytes32,address,address)'),
    SetStorage: SET_STORAGE_SIG,
    SetReputationSystem: wweb3.eth.abi.encodeFunctionSignature(
      'setReputationSystem(address)'),
    SetRegulatingRating: wweb3.eth.abi.encodeFunctionSignature(
      'setRegulatingRating(address)'),
    SetTokenSale: wweb3.eth.abi.encodeFunctionSignature(
      'setTokenSale(address)'),
    SetProjectController: SET_PROJECT_CONTROLLER,
    Activate: wweb3.eth.abi.encodeFunctionSignature(
      'activate(bytes32,uint256,uint256)'),
    AddMilestone: wweb3.eth.abi.encodeFunctionSignature(
      'addMilestone(bytes32,uint256,bytes32[],bytes32[],uint256[])'),
    AdminFinalize: wweb3.eth.abi.encodeFunctionSignature(
      'adminFinalize(bytes32,uint256)')
  }
  MilestoneController.Storage = {
    Self: artifacts.require(
      'modules/milestone_controller/MilestoneControllerStorage'),
    CI: Web3.utils.keccak256('MilestoneControllerStorage')
  }
  MilestoneController.View = {
    Self: artifacts.require(
      'modules/milestone_controller/MilestoneControllerView')
  }
  MilestoneController.State = {
    INACTIVE: 0,
    IP: 1,
    RS: 2,
    RP: 3,
    COMPLETION: 4
  }

  // Token Sale
  class TokenSale {}
  TokenSale.Self = artifacts.require('modules/token_sale/TokenSale')
  TokenSale.CI = Web3.utils.keccak256('TokenSale')
  TokenSale.Sig = {
    SetProjectController: SET_PROJECT_CONTROLLER,
    SetStorage: SET_STORAGE_SIG
  }
  TokenSale.Storage = {
    Self: artifacts.require('modules/token_sale/TokenSaleStorage'),
    CI: Web3.utils.keccak256('TokenSaleStorage')
  }

  // Token Collector
  class TokenCollector {}
  TokenCollector.Self = artifacts.require(
    'modules/token_collector/TokenCollector')
  TokenCollector.CI = Web3.utils.keccak256('TokenCollector')
  TokenCollector.Sig = {
    Deposit: wweb3.eth.abi.encodeFunctionSignature(
      'deposit(bytes32,address,uint256)'),
    Withdraw: wweb3.eth.abi.encodeFunctionSignature(
      'withdraw(bytes32,address,address,uint256)'),
    SetStorage: SET_STORAGE_SIG
  }
  TokenCollector.Storage = {
    Self: artifacts.require('modules/token_collector/TokenCollectorStorage'),
    CI: Web3.utils.keccak256('TokenCollectorStorage')
  }

  // Ether Collector
  class EtherCollector {}
  EtherCollector.Self = artifacts.require(
    'modules/ether_collector/EtherCollector')
  EtherCollector.CI = Web3.utils.keccak256('EtherCollector')
  EtherCollector.Sig = {
    Deposit: wweb3.eth.abi.encodeFunctionSignature('deposit(bytes32)'),
    Withdraw: wweb3.eth.abi.encodeFunctionSignature(
      'withdraw(bytes32,address,uint256)'),
    InsideTransfer: wweb3.eth.abi.encodeFunctionSignature(
      'insideTransfer(bytes32,bytes32,uint256)'),
    SetStorage: SET_STORAGE_SIG
  }
  EtherCollector.Storage = {
    Self: artifacts.require('modules/ether_collector/EtherCollectorStorage'),
    CI: Web3.utils.keccak256('EtherCollectorStorage')
  }

  /**
   * Contracts - Modules
   */
  // RegulatingRating
  class RegulatingRating {}
  RegulatingRating.Self = artifacts.require(
    'modules/regulating_rating/RegulatingRating')
  RegulatingRating.CI = Web3.utils.keccak256('RegulatingRating')
  RegulatingRating.Sig = {
    Start: wweb3.eth.abi.encodeFunctionSignature(
      'start(bytes32,uint256,uint256,uint256,bytes32[],bytes32[],uint256[])'),
    FinalizeAllBids: wweb3.eth.abi.encodeFunctionSignature(
      'finalizeAllBids(bytes32,uint256)'),
    FinalizeBidForObj: wweb3.eth.abi.encodeFunctionSignature(
      'finalizeBidForObj(bytes32,uint256,finalizeBidForObj)'),
    Bid: wweb3.eth.abi.encodeFunctionSignature(
      'bid(bytes32,uint256,bytes32)'),
    BackOutFromBid: wweb3.eth.abi.encodeFunctionSignature(
      'backOutFromBid(bytes32,uint256,bytes32)'),
    SetStorage: SET_STORAGE_SIG,
    SetReputationSystem: SET_REPUTATION_SYSTEM,
    SetProjectController: SET_PROJECT_CONTROLLER
  }
  RegulatingRating.Storage = {
    Self: artifacts.require(
      'modules/regulating_rating/RegulatingRatingStorage'),
    CI: Web3.utils.keccak256('RegulatingRatingStorage')
  }

  /**
   * Contracts - mocks
   */
  // Mocked Project Controllers
  class MockedProjectController {}
  MockedProjectController.Self = artifacts.require(
    'mocks/MockedProjectController')
  MockedProjectController.CI = Web3.utils.keccak256('MockedProjectController')
  MockedProjectController.Sig = {
    RegisterOwner: wweb3.eth.abi.encodeFunctionSignature(
      'registerOwner(bytes32,address)'),
    SetState: wweb3.eth.abi.encodeFunctionSignature(
      'setState(bytes32,uint256)')
  }

  class MockedProjectController2 {}
  MockedProjectController2.Self = artifacts.require(
    'mocks/MockedProjectController2')
  MockedProjectController2.CI = Web3.utils.keccak256('MockedProjectController2')
  MockedProjectController2.Sig = {
    RegisterOwner: wweb3.eth.abi.encodeFunctionSignature(
      'registerOwner(bytes32,address)'),
    SetState: wweb3.eth.abi.encodeFunctionSignature(
      'setState(bytes32,uint256)')
  }

  // Mocked Sale for registry
  class MockedSale {}
  MockedSale.Self = artifacts.require('./mocks/MockedSale.sol')

  // Mocked Project Token
  class MockProjectToken1 {}
  MockProjectToken1.Self = artifacts.require('./mocks/MockProjectToken1.sol')
  // Mocked Project Token
  class MockProjectToken2 {}
  MockProjectToken2.Self = artifacts.require('./mocks/MockProjectToken2.sol')
  // Mocked Project Token
  class MockProjectToken3 {}
  MockProjectToken3.Self = artifacts.require('./mocks/MockProjectToken3.sol')
  // Mocked Project Token
  class MockProjectToken4 {}
  MockProjectToken4.Self = artifacts.require('./mocks/MockProjectToken4.sol')

  return {
    'RefundManager': RefundManager,
    'ProjectController': ProjectController,
    'MockedProjectController': MockedProjectController,
    'MockedProjectController2': MockedProjectController2,
    'MilestoneController': MilestoneController,
    'EtherCollector': EtherCollector,
    'TokenCollector': TokenCollector,
    'TokenSale': TokenSale,
    'MockedSale': MockedSale,
    'RegulatingRating': RegulatingRating,
    'RewardManager': RewardManager,
    'PaymentManager': PaymentManager,
    'Library': Library,
    'PLCRVoting': PLCRVoting,
    'Challenge': Challenge,
    'Registry': Registry,
    'Parameterizer': Parameterizer,
    'MockProjectToken1': MockProjectToken1,
    'MockProjectToken2': MockProjectToken2,
    'MockProjectToken3': MockProjectToken3,
    'MockProjectToken4': MockProjectToken4
  }
}
