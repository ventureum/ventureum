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
const tokenSale = require(rootDir + 'script/demo/demo.js').tokenSale
const projectAddMilestones = require(rootDir + 'script/demo/demo.js').projectAddMilestones


module.exports = async function (callback) {
  /*
   * Accounts and Contracts
   */
  const Accounts = getDemoAccounts(web3)
  const Contracts = await deployedContracts.getContracts(artifacts)

  /*
   * Constants
   */
  const projectName = "project after token sale finalized"
  const length = [600, 600]
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
  tokenSaleInfo.totalEtherReceived = "10" + '0'.repeat(18)

  /*
   * Ether&Token prepare
   */
  const projectOwnerInitVtx = new BigNumber("50000" + '0'.repeat(18))

  /*
   * Backdoor functions
   */
  advanceBlock(web3)
  const expiryTime = latestTime(web3) + 10000000
  await whitelistProject(Contracts, artifacts, projectName, Accounts.PROJECT_OWNER, expiryTime)
  await initMilestone(Contracts, artifacts, projectName)
  await projectAddMilestones(Contracts, artifacts, projectName, milestoneInfo)
  await tokenSale(Contracts, artifacts, projectName, tokenSaleInfo)
  console.log("token sale end")
}
