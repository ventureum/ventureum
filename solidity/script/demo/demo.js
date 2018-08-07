'use strict'

const rootDir = '../../'

const OwnSolConfig = require(rootDir + 'config/ownSolConfig.js')
const ThirdPartySolConfig = require(rootDir + 'config/thirdPartySolConfig.js')
const ThirdPartyJsConfig = require(rootDir + 'config/thirdPartyJsConfig.js')

const duration = require('openzeppelin-solidity/test/helpers/increaseTime').duration

const latestTime = require(rootDir + 'config/TimeSetter.js').latestTime
const advanceBlock = require(rootDir + 'config/TimeSetter.js').advanceBlock

const deployedContracts = require(rootDir + 'config/deployedContracts.js')

const BigNumber = require('bignumber.js')

const OWNER = 'owner'
const TOKEN_ADDRESS = 'tokenAddress'
const PROJECT_STATE = 'projectState'
const NAMESPACE = 'namespace'

module.exports = async function (artifacts, accounts, web3) {
  const projectTokenInitAmount = new BigNumber("10000" + '0'.repeat(18))
  const projectOwnerInitVtx = new BigNumber("500000" + '0'.repeat(18))
  const NULL = "0x0"

  //Get Constant
  const _ownSolConstants = OwnSolConfig.default(artifacts)
  const _thirdPartySolConstants = ThirdPartySolConfig.default(artifacts)
  const _thirdPartyJsConstants = ThirdPartyJsConfig.default()

  // Own contracts:
  //* VTCR
  const PLCRVoting = _ownSolConstants.PLCRVoting
  const Challenge = _ownSolConstants.Challenge
  const Parameterizer = _ownSolConstants.Parameterizer
  const Registry = _ownSolConstants.Registry

  const RefundManager = _ownSolConstants.RefundManager
  const RewardManager = _ownSolConstants.RewardManager
  const ProjectController = _ownSolConstants.ProjectController
  const MilestoneController = _ownSolConstants.MilestoneController
  const EtherCollector = _ownSolConstants.EtherCollector
  const TokenCollector = _ownSolConstants.TokenCollector
  const RegulatingRating = _ownSolConstants.RegulatingRating
  const TokenSale = _ownSolConstants.TokenSale

  const VetXToken = _thirdPartySolConstants.VetXToken
  const ReputationSystem = _thirdPartySolConstants.ReputationSystem
  const TimeSetter = _thirdPartySolConstants.TimeSetter
  const CarbonVoteX = _thirdPartySolConstants.CarbonVoteX

  const Web3 = _thirdPartyJsConstants.Web3
  const saltHashVote = _thirdPartyJsConstants.saltHashVote
  const wweb3 = _thirdPartyJsConstants.wweb3
  const should = _thirdPartyJsConstants.should

  /*
   * addresses
   */
  const ROOT = accounts[0]
  const PROJECT_OWNER = accounts[1]
  const CHALLENGER = accounts[2]
  const VOTER1 = accounts[3]
  const VOTER2 = accounts[4]

  const PURCHASER1 = accounts[2]
  const PURCHASER2 = accounts[3]
  const PURCHASER3 = accounts[4]

  const INVESTOR1 = accounts[2]
  const INVESTOR2 = accounts[3]
  const REGULATOR1 = accounts[5]
  const REGULATOR2 = accounts[6]

  const Contracts = await deployedContracts.getContracts(artifacts)

  let applyApplication = async function (projectName, owner, applyLen) {
    // set constants
    const amount = new BigNumber(Parameterizer.paramDefaults.minDeposit)
    const availableFund = amount.div(2)
    advanceBlock(web3)
    const applicationExpiry = latestTime(web3) + applyLen
    const whitelisted = false
    const unstakedDeposit = amount.minus(amount.div(2))
    const challengeID = 0

    /*
     * deposit vtx to registry
     */
    await Contracts.vetXToken.transfer(
      Contracts.registry.address,
      amount,
      {from: owner}).should.be.fulfilled

    /*
     * registry.apply
     */
    await Contracts.registry.backDoorSetting(
      availableFund,
      applicationExpiry,
      whitelisted,
      owner,
      unstakedDeposit,
      challengeID,
      projectName)
    // projectController-registerProject
    const projectHash = wweb3.utils.keccak256(projectName)
    await Contracts.projectControllerStorage.setAddress(
      Web3.utils.soliditySha3(projectHash, OWNER),
      owner)
    await Contracts.projectControllerStorage.setAddress(
      Web3.utils.soliditySha3(projectHash, TOKEN_ADDRESS),
      NULL)
    await Contracts.projectControllerStorage.setUint(
      Web3.utils.soliditySha3(projectHash, PROJECT_STATE),
      ProjectController.State.AppSubmitted)
    await Contracts.projectControllerStorage.setBytes32(
      Web3.utils.soliditySha3(owner, NAMESPACE),
      projectHash)
    // projectHashList-insert
    await Contracts.registry.backDoorInsert(projectName)
  }

  let main = async function () {
    await Contracts.vetXToken.transfer(PROJECT_OWNER, projectOwnerInitVtx)
    await applyApplication("demo1", PROJECT_OWNER, 100000)
  }

  main()
}
