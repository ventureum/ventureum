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
const projectAddMilestones = require(rootDir + 'script/demo/demo.js').projectAddMilestones


module.exports = async function (callback) {
  const projectName = "project after add milestones"
  const length = [60, 60]
  const objs = [
    ['milestone1 obj1', 'milestone1 obj2'],
    ['milesotne2 obj1', 'milesotne2 obj2']]
  const objTypes = [
    ['Technical Development', 'Business Development'],
    ['Technical Development', 'Business Development']]
  const rewards = [
    [100, 200],
    [300, 400]]
  const milestoneInfo = [length, objs, objTypes, rewards]

  /*
   * Accounts and Contracts
   */
  const Accounts = getDemoAccounts(web3)
  const Contracts = await deployedContracts.getContracts(artifacts)

  /*
   * Ether&Token prepare
   */
  const projectOwnerInitVtx = new BigNumber("500000" + '0'.repeat(18))
  await Contracts.vetXToken.transfer(Accounts.PROJECT_OWNER, projectOwnerInitVtx)

  /*
   * Backdoor functions
   */
  advanceBlock(web3)
  const expiryTime = latestTime(web3) + 10000000
  await whitelistProject(Contracts, artifacts, projectName, Accounts.PROJECT_OWNER, expiryTime)
  await projectAddMilestones(Contracts, artifacts, projectName, milestoneInfo)
  console.log("add milestone end")
}
