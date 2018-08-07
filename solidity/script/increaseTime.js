const rootDir = "../"

const increaseTimeTo = require(rootDir + 'config/TimeSetter.js').increaseTimeTo
const latestTime = require(rootDir + 'config/TimeSetter.js').latestTime
const advanceBlock = require(rootDir + 'config/TimeSetter.js').advanceBlock
const duration = require('openzeppelin-solidity/test/helpers/increaseTime').duration

module.exports = async function (callback) {
  const now = await latestTime(web3)
  await increaseTimeTo(web3, now + duration.days(6))
  await advanceBlock(web3)
}
