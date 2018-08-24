'use strict'

const rootDir = '../../'

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
const ThirdPartyJsConfig = require(rootDir + 'config/thirdPartyJsConfig.js')
const toHash = require(rootDir + 'script/ipfs.js').toHash


module.exports = async function (callback) {
  const projectName = process.argv[4]

  if (projectName === undefined) {
    console.log("please input project name")
    return
  }

  const day = 60 * 60 * 24
  const length = [100 * day, 200 * day]
  const objs = [
    [
      'Publish the Covet consensus algorithm which combines the best features of both Proof-of-Work mining and Proof-of-Stake mechanism.',
      'Launch the test network for the Covet blockchain.',
      'Public test of the Covet blockchain’s anonymity feature.'
    ], [
      'Launch of the Covet blockchain.',
      'Publish full node implementation in C++ and GoLang for Windows, macOS and Linux.',
      'Launch Covet Wallet for iOS and Android',
      'List CovetCoin on at least 3 of the top 10 crypto exchanges in the world.'
    ]]

  const objTypes = [
    ['Technical Development', 'Technical Development', 'Technical Development'],
    ['Technical Development', 'Technical Development', 'Technical Development', 'Business Development']]

  const wweb3 = ThirdPartyJsConfig.default(artifacts).wweb3
  console.log(wweb3.utils.toWei('0.08', 'ether'))
  const rewards = [
    [
      wweb3.utils.toWei("0.08", 'ether'),
      wweb3.utils.toWei("0.06", 'ether'),
      wweb3.utils.toWei("0.04", 'ether')
    ], [
      wweb3.utils.toWei("0.08", 'ether'),
      wweb3.utils.toWei("0.05", 'ether'),
      wweb3.utils.toWei("0.05", 'ether'),
      wweb3.utils.toWei("0.08", 'ether')
    ]]
  const milestoneInfo = {}
  milestoneInfo.length = length
  milestoneInfo.objs = await toHash(objs)
  milestoneInfo.objTypes = objTypes
  milestoneInfo.rewards = rewards

  /*
   * Accounts and Contracts
   */
  const Accounts = getDemoAccounts(web3)
  const Contracts = await deployedContracts.getContracts(artifacts)

  /*
   * Backdoor functions
   */
  await whitelistProject(Contracts, artifacts, projectName, Accounts.PROJECT_OWNER, null)
  await initMilestone(Contracts, artifacts, projectName, milestoneInfo)
  await projectAddMilestones(Contracts, artifacts, projectName, milestoneInfo)
  console.log("add milestone done")
}
