const rootDir = '../'
const advanceBlock = require(rootDir + 'config/TimeSetter.js').advanceBlock

module.exports = async function (callback) {
  await advanceBlock(web3)
  console.log("advance block end!")
}
