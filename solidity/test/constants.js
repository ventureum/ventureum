const OwnSolConfig = require('../config/ownSolConfig.js')
const ThirdPartySolConfig = require('../config/thirdPartySolConfig.js')
const ThirdPartyJsConfig = require('../config/thirdPartyJsConfig.js')

const _ownSolConstants = OwnSolConfig.default(artifacts)
const _thirdPartySolConstants = ThirdPartySolConfig.default(artifacts)
const _thirdPartyJsConstants = ThirdPartyJsConfig.default()

// Own contracts:
const RefundManager = _ownSolConstants.RefundManager
const ProjectController = _ownSolConstants.ProjectController
const MockedProjectController = _ownSolConstants.MockedProjectController
const MockedProjectController2 = _ownSolConstants.MockedProjectController2
const MilestoneController = _ownSolConstants.MilestoneController
const EtherCollector = _ownSolConstants.EtherCollector
const TokenCollector = _ownSolConstants.TokenCollector
const TokenSale = _ownSolConstants.TokenSale
const MockedSale = _ownSolConstants.MockedSale
const RegulatingRating = _ownSolConstants.RegulatingRating
const RewardManager = _ownSolConstants.RewardManager
const PaymentManager = _ownSolConstants.PaymentManager
const Library = _ownSolConstants.Library
const Challenge = _ownSolConstants.Challenge
const PLCRVoting = _ownSolConstants.PLCRVoting
const Parameterizer = _ownSolConstants.Parameterizer
const Registry = _ownSolConstants.Registry

// Third party JS:
const fs = _thirdPartyJsConstants.fs
const expect = _thirdPartyJsConstants.expect
const wweb3 = _thirdPartyJsConstants.wweb3
const Web3 = _thirdPartyJsConstants.Web3
const should = _thirdPartyJsConstants.should
const saltHashVote = _thirdPartyJsConstants.saltHashVote

// Third party solidity contracts:
const Error = _thirdPartySolConstants.Error
const VetXToken = _thirdPartySolConstants.VetXToken
const SafeMath = _thirdPartySolConstants.SafeMath
const CarbonVoteX = _thirdPartySolConstants.CarbonVoteX
const TimeSetter = _thirdPartySolConstants.TimeSetter
const ReputationSystem = _thirdPartySolConstants.ReputationSystem
const Presale = _thirdPartySolConstants.Presale
const Kernel = _thirdPartySolConstants.Kernel
const ACLHandler = _thirdPartySolConstants.ACLHandler
const ContractAddressHandler = _thirdPartySolConstants.ContractAddressHandler
const Storage = _thirdPartySolConstants.Storage

export {
  Kernel,
  ACLHandler,
  ContractAddressHandler,
  RefundManager,
  ProjectController,
  MockedProjectController,
  MockedProjectController2,
  MilestoneController,
  EtherCollector,
  TokenCollector,
  TokenSale,
  Storage,
  MockedSale,
  wweb3,
  Web3,
  should,
  TimeSetter,
  Error,
  fs,
  VetXToken,
  SafeMath,
  CarbonVoteX,
  ReputationSystem,
  RegulatingRating,
  RewardManager,
  PaymentManager,
  expect,
  Library,
  Challenge,
  PLCRVoting,
  Parameterizer,
  Registry,
  saltHashVote,
  Presale
}
