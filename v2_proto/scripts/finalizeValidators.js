var Milestone = artifacts.require('Milestone')

const project = '0x34b0720df51fc665a1a1c2c161c0d5ed75191f138329f83051ad7208fc0a06a2'

module.exports = async function (callback) {
  var milestone = await Milestone.deployed()
  await milestone.finalizeValidators(project, 1, 3)
}
