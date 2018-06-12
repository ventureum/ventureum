const Constant = require('../config/config.js')

const _constant = Constant.default(artifacts)

const Kernel = _constant.Kernel
const ACLHandler = _constant.ACLHandler
const ContractAddressHandler = _constant.ContractAddressHandler
const RefundManager = _constant.RefundManager
const ProjectController = _constant.ProjectController
const MockedProjectController = _constant.MockedProjectController
const MockedProjectController2 = _constant.MockedProjectController2
const MilestoneController = _constant.MilestoneController
const EtherCollector = _constant.EtherCollector
const TokenCollector = _constant.TokenCollector
const TokenSale = _constant.TokenSale
const Storage = _constant.Storage
const Token = _constant.Token
const Registry = _constant.Registry
const MockedSale = _constant.MockedSale
const wweb3 = _constant.wweb3
const Web3 = _constant.Web3
const should = _constant.should
const TimeSetter = _constant.TimeSetter
const Error = _constant.Error
const fs = _constant.fs
const VetXToken = _constant.VetXToken
const SafeMath = _constant.SafeMath

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
  Token,
  Registry,
  MockedSale,
  wweb3,
  Web3,
  should,
  TimeSetter,
  Error,
  fs,
  VetXToken,
  SafeMath
}
