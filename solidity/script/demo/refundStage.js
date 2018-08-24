'use strict'

const rootDir = '../../'

/*
 * TimeSetter
 */
const latestTime = require(rootDir + 'config/TimeSetter.js').latestTime
const advanceBlock = require(rootDir + 'config/TimeSetter.js').advanceBlock

/*
 * tools
 */
const deployedContracts = require(rootDir + 'config/deployedContracts.js')
const getDemoAccounts = require(rootDir + 'script/demo/accounts.js').getDemoAccounts
const BigNumber = require('bignumber.js')

/*
 * backdoor functions
 */
const whitelistProject = require(rootDir + 'script/demo/demo.js').whitelistProject
const initMilestone = require(rootDir + 'script/demo/demo.js').initMilestone
const projectAddMilestones = require(rootDir + 'script/demo/demo.js').projectAddMilestones
const tokenSale = require(rootDir + 'script/demo/demo.js').tokenSale
const activateMilestone = require(rootDir + 'script/demo/demo.js').activateMilestone
const refundStage = require(rootDir + 'script/demo/demo.js').refundStage


module.exports = async function (callback) {
  /*
   * Accounts and Contracts
   */
  const Accounts = getDemoAccounts(web3)
  const Contracts = await deployedContracts.getContracts(artifacts)

  /*
   * Constants
   */
  const day = 60 * 60 * 24
  const projectName = "project refund stage"
  const length = [60 * day, 60 * day]
  const objs = [
    ['ts milestone1 obj1', 'ts milestone1 obj2'],
    ['ts milesotne2 obj1', 'ts milesotne2 obj2']]
  const objTypes = [
    ['Technical Development', 'Business Development'],
    ['Technical Development', 'Business Development']]
  const rewards = [
    [100, 200],
    [300, 400]]
  const milestoneInfo = [length, objs, objTypes, rewards]
  let tokenSaleInfo = {}
  tokenSaleInfo.rate = 10
  tokenSaleInfo.projectToken = Contracts.mockProjectToken1
  tokenSaleInfo.initTotalTokenForSale = "10" + '0'.repeat(18)
  tokenSaleInfo.projectTokenBalance = "5" + '0'.repeat(18)
  tokenSaleInfo.totalEtherReceived = "100" + '0'.repeat(18)
  let activateInfo = {}
  const now = latestTime(web3)
  activateInfo.id = 1
  activateInfo.weiLocked = "1" + '0'.repeat(18)
  activateInfo.startTime = now - 30 * day
  activateInfo.endTime  = activateInfo.startTime + length[activateInfo.id - 1]
  activateInfo.minStartTime = now - day
  activateInfo.maxStartTime = now + day
  activateInfo.rewards = rewards[activateInfo.id - 1]

  /*
   * Ether&Token prepare
   */
  const projectOwnerInitVtx = new BigNumber("50000" + '0'.repeat(18))

  /*
   * Backdoor functions
   */
  advanceBlock(web3)
  const expiryTime = now + 10000000
  await whitelistProject(Contracts, artifacts, projectName, Accounts.PROJECT_OWNER, expiryTime)
  await initMilestone(Contracts, artifacts, projectName)
  await projectAddMilestones(Contracts, artifacts, projectName, milestoneInfo)
  await tokenSale(Contracts, artifacts, projectName, tokenSaleInfo)

  await activateMilestone(Contracts, artifacts, projectName, activateInfo)
  await refundStage(Contracts, artifacts, projectName, activateInfo.id)
  console.log("refund stage end")
}
