const rootDir = '../../'

const main = require(rootDir + "script/stepJumpScript/mainScript.js")
const mockData = require(rootDir + "script/stepJumpScript/mockData.js")

module.exports = async function (callback) {
  const data = mockData(artifacts)

  // Jump to after token sale (finalized)
  // the project owner should start to activate the first milestone (id = 1)
  await main(
    data.STATES.MILESTONE_BEGIN,
    data.STATES.DEFAULT_MILESTONE_ID,
    artifacts,
    web3.eth.accounts,
    web3)
}
