'use strict'

const rootDir = '../../'

/*
 * tools
 */
const deployedContracts = require(rootDir + 'config/deployedContracts.js')

/*
 * backdoor functions
 */
const removeProject = require(rootDir + 'script/demo/demo.js').removeProject

module.exports = async function (callback) {
  /*
   * Accounts and Contracts
   */
  const args = process.argv
  const Contracts = await deployedContracts.getContracts(artifacts)

  /*
   * Backdoor functions
   */
  if (args[4] === undefined) {
    console.log("please input project name.")
    return
  }

  await removeProject(Contracts, artifacts, args[4])
  console.log("remove project " + args[4] + " success")
}
