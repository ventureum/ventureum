'use strict'

const rootDir = '../'

const ThirdPartySolConstants = require(rootDir + 'config/thirdPartySolConfig.js')
const OwnSolConstants = require(rootDir + 'config/ownSolConfig.js')

exports.initMockData = async (instances, accounts, artifacts) => {
  const _thirdPartySolConstants = ThirdPartySolConstants.default(artifacts)

  // third party solidity solidity
  const ReputationSystem = _thirdPartySolConstants.ReputationSystem

  // Reputation System
  const reputationSystem = instances.reputationSystem

  // Initial mock
  const data = require('../config/mockData/mockRepVec.json')
  for (var id in data) {
    let reputations = data[id]
    for (var member in reputations) {
      let obj = reputations[member]
      for (var contextType in obj) {
        let context = obj[contextType]
        await reputationSystem.setRepVec(
          id,
          member,
          contextType,
          context.lastUpdate,
          context.updateBlockNumber,
          context.votes,
          context.pollIds,
          context.pendingVotes,
          context.totalPendingVotes
        )
      }
    }
  }
}
