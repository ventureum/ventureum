const rootDir = '../'
const advanceBlock = require(rootDir + 'config/TimeSetter.js').advanceBlock

module.exports = async function (callback) {
  await advanceBlock(web3)
}
