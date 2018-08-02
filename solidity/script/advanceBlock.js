const advanceBlock = require('./../config/TimeSetter.js').advanceBlock

module.exports = async function (callback) {
  await advanceBlock(web3)
}
