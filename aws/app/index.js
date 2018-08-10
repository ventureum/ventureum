let CarbonVoteX = require('./carbonVoteX.js')
let loadInfo = require('./loader.js')

const NAMESPACE = 'namespace'
const NAME = 'name'
const WRITE_AVAILABLE_VOTES= 'writeAvailableVotes'
const GET_ESTIMATE_GAS= 'getEstimateGas'
const POLL_ID = 'pollId'
const ADDRESS = 'address'

exports.handler = (event, context, callback) => {
  main(event, context, callback)
}

var main = async function (event, context, callback) {
  let info = await loadInfo()
  info[NAMESPACE] = event[NAMESPACE]
  let CarbonVoteXSystem = new CarbonVoteX(info)

  if (event[NAME] === WRITE_AVAILABLE_VOTES) {
    CarbonVoteXSystem.writeAvailableVotes(event[POLL_ID], event[ADDRESS], callback)
  } else if (event[NAME] === GET_ESTIMATE_GAS) {
    CarbonVoteXSystem.getEstimateGas(event[POLL_ID], event[ADDRESS], callback)
  } else {
    callback("The 'name' must be one of ['writeAvailableVotes', 'getEstimateGas']")
  }
}
