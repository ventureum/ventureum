import { increaseTimeTo, duration } from
  'openzeppelin-solidity/test/helpers/increaseTime'
import latestTime from 'openzeppelin-solidity/test/helpers/latestTime'
import EVMRevert from 'openzeppelin-solidity/test/helpers/EVMRevert'
import { advanceBlock } from 'openzeppelin-solidity/test/helpers/advanceToBlock'

const ThirdPartyJsConfig = require("../config/thirdPartyJsConfig.js")
const moment = require("moment")

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
  Presale.StartTime = moment().add(1, 'weeks').unix()
  Presale.EndTime = moment().add(2, 'weeks').unix()

  return {
    'TimeSetter': TimeSetter,
    'Error': Error,
    'VetXToken': VetXToken,
    'SafeMath': SafeMath,
    'ReputationSystem': ReputationSystem,
    'CarbonVoteX': CarbonVoteX,
    'Presale': Presale
  }
}
