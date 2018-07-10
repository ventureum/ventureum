const main = require("./mainScript.js")
const mockData = require("./mockData.js")

module.exports = async function (callback) {
  const data = mockData(artifacts)
  const MILESTONE_ID = parseInt(process.argv[4])

  if (
    isNaN(MILESTONE_ID) ||
    MILESTONE_ID < 1 ||
    MILESTONE_ID > data.MILESTONE_LENGTH.length) {
    console.log("The milestone id must in [1, ", data.MILESTONE_LENGTH.length, "].")
    return;
  }

  await main(
    data.STATES.MILESTONE_REFUND,
    MILESTONE_ID,
    artifacts,
    web3.eth.accounts,
    web3)
}
