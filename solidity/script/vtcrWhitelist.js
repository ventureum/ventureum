const main = require("./mainScript.js")

VTCR_WHITELIST = 1
MILESTONE_NULL_ID = 0

module.exports = async function (callback) {
  await main(VTCR_WHITELIST, MILESTONE_NULL_ID, artifacts, web3.eth.accounts)
}
