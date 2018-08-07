const rootDir = '../../'
const demo = require(rootDir + 'script/demo/demo.js')

module.exports = async function (callback) {
  await demo(
    artifacts,
    web3.eth.accounts,
    web3)
}
