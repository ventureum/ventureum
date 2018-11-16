var RepSys = artifacts.require('RepSys')

const project = '0x34b0720df51fc665a1a1c2c161c0d5ed75191f138329f83051ad7208fc0a06a2'

module.exports = async function (callback) {
  var repSys = await RepSys.deployed()

  // modifiy the following data
  let request = {
    projectId: project,
    user: '0xfB23daE37BEBdA98F2aE721C11177e60195A8D57', // public key
    val: '100000' // available votes
  }

  let { projectId, user, val } = request
  await repSys.writeVotes(projectId, user, val)
}
