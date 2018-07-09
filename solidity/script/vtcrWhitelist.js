const main = require("./mainScript.js")

module.exports = async function (callback) {
  await main(1, 0, artifacts, web3.eth.accounts)
}


