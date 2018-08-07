import { increaseTimeTo, duration } from 'openzeppelin-solidity/test/helpers/increaseTime'
import latestTime from 'openzeppelin-solidity/test/helpers/latestTime'
import EVMRevert from 'openzeppelin-solidity/test/helpers/EVMRevert'
import { advanceBlock } from 'openzeppelin-solidity/test/helpers/advanceToBlock'

const rootDir = '../'

const ThirdPartyJsConfig = require(rootDir + "config/thirdPartyJsConfig.js")

export default function (artifacts) {
  const _thirdPartyJsConstants = ThirdPartyJsConfig.default()

  const wweb3 = _thirdPartyJsConstants.wweb3
  const Web3 = _thirdPartyJsConstants.Web3

  /* ---------------------Utils------------------------------------------------ */
  class TimeSetter {}
  TimeSetter.increaseTimeTo = increaseTimeTo
  TimeSetter.duration = duration
  TimeSetter.latestTime = latestTime
  TimeSetter.OneMonth = duration.days(1) * 30
  TimeSetter.OneWeek = duration.weeks(1)
  TimeSetter.OneYear = duration.years(1)
  TimeSetter.advanceBlock = advanceBlock

  class Error {}
  Error.EVMRevert = EVMRevert

  /* ---------------------Contracts-------------------------------------------- */
  /**
   *  External Contracts
   */
  // VetXToken
  class VetXToken {}
  VetXToken.Self = artifacts.require('./VetXToken')
  VetXToken.initAmount = '1000000000000000000000000000'
  VetXToken.tokenName = 'VetX'
  VetXToken.decimalUnits = 18
  VetXToken.tokenSymbol = 'VTX'

  // SafeMath
  class SafeMath {}
  SafeMath.Self = artifacts.require('./SafeMath')

  // ReputationSystem
  class ReputationSystem {}
  ReputationSystem.Self = artifacts.require('./ReputationSystem')
  ReputationSystem.CI = Web3.utils.keccak256('ReputationSystem')
  ReputationSystem.updateInterval = 100000
  ReputationSystem.prevVotesDiscount = 90
  ReputationSystem.newVotesDiscount = 10
  ReputationSystem.defaultAddressCanRegister = '0x0'

  // CarbonVoteXCore
  class CarbonVoteX {}
  CarbonVoteX.Core = artifacts.require('./CarbonVoteXCore')
  CarbonVoteX.receiverFunctions = [Web3.utils.sha3('register')]
  CarbonVoteX.sendGas = Web3.utils.sha3('sendGas')

  // Presale
  class Presale {}
  Presale.Self = artifacts.require("./Presale")

  // Conversion
  class Conversion {}
  Conversion.Self = artifacts.require("./Conversion")

  //* -------- Kingston -----------
  /**
   * Contracts - kernel
   */
  class Kernel {}
  Kernel.Self = artifacts.require('./Kernel')
  Kernel.RootCI = Web3.utils.keccak256('root')

  /**
   * Contracts - handlers
   */
  // ACLHandler
  class ACLHandler {}
  ACLHandler.Self = artifacts.require('./ACLHandler')
  ACLHandler.CI = Web3.utils.keccak256('ACLHandler')

  // ContractAddressHandler
  class ContractAddressHandler {}
  ContractAddressHandler.Self = artifacts.require(
    './ContractAddressHandler')
  ContractAddressHandler.CI = Web3.utils.keccak256('ContractAddressHandler')

  /**
   * Contracts - storage
   */
  class Storage {}
  Storage.Sig = {
    SetUint: wweb3.eth.abi.encodeFunctionSignature('setUint(bytes32,uint256)'),
    GetUnit: wweb3.eth.abi.encodeFunctionSignature('getUint(bytes32)'),
    SetAddress: wweb3.eth.abi.encodeFunctionSignature(
      'setAddress(bytes32,address)'),
    GetAddress: wweb3.eth.abi.encodeFunctionSignature('getAddress(bytes32)'),
    SetBytes32: wweb3.eth.abi.encodeFunctionSignature(
      'setBytes32(bytes32,bytes32)'),
    GetBytes32: wweb3.eth.abi.encodeFunctionSignature('getBytes32(bytes32)'),
    SetArray: wweb3.eth.abi.encodeFunctionSignature(
      'setArray(bytes32,bytes32[])'),
    GetArray: wweb3.eth.abi.encodeFunctionSignature('getArray(bytes32)'),
    SetUintArray: wweb3.eth.abi.encodeFunctionSignature(
      'setUintArray(bytes32,uint256[])'),
    GetUintArray: wweb3.eth.abi.encodeFunctionSignature(
      'getUintArray(bytes32)'),
    SetAddressArray: wweb3.eth.abi.encodeFunctionSignature(
      'setAddressArray(bytes32,address[])'),
    GetAddressArray: wweb3.eth.abi.encodeFunctionSignature(
      'getAddressArray(bytes32)')
  }


  return {
    'TimeSetter': TimeSetter,
    'Error': Error,
    'VetXToken': VetXToken,
    'SafeMath': SafeMath,
    'ReputationSystem': ReputationSystem,
    'CarbonVoteX': CarbonVoteX,
    'Presale': Presale,
    'Conversion': Conversion,
    'Kernel': Kernel,
    'ACLHandler': ACLHandler,
    'ContractAddressHandler': ContractAddressHandler,
    'Storage': Storage
  }
}

