var RepSys = artifacts.require("RepSys")
var Milestone = artifacts.require("Milestone")
web3.eth.getAccountsPromise = function () {
  return new Promise(function (resolve, reject) {
    web3.eth.getAccounts(function (e, accounts) {
      if (e != null) {
        reject(e)
      } else {
        console.log('accounts:', accounts)
        resolve(accounts)
      }
    })
  })
}

module.exports = async function (callback) {
  var accounts = await web3.eth.getAccountsPromise()
  var repSys = await RepSys.deployed()
  var milestone = await Milestone.deployed()

  const project = "0x34b0720df51fc665a1a1c2c161c0d5ed75191f138329f83051ad7208fc0a06a2"

  var root = accounts[0]
  var userKOL = accounts[1]
  var userProjectFounder = accounts[2]
  var user = accounts[3]
  var user1 = accounts[4]

  const typeKOL = "0xf4af7c06"
  const typeProjectFounder = "0x5707a2a6"
  const typeUser = "0x2db9fd3d"

  const userKOLId = "0xb69a0b3febe9555482b80f7cc4057e72"
  const userProjectFounderId = "0x381be76e0ae9afae7acb0e9598175ede"
  const userId = "0xcb61ad33d3763aed2bc16c0f57ff251a"
  const user1Id = "0xa1c2b8080ed4b6f56211e0295659ef87"

  const userKOLMeta = {
    username: 'kol_username',
    photoUrl: 'https://randomuser.me/api/portraits/men/64.jpg',
    telegramId: '-10023340203',
    phoneNumber: '+15198971683'
  }

  const userProjectFounderMeta = {
    username: 'kol_username',
    photoUrl: 'https://randomuser.me/api/portraits/men/64.jpg',
    telegramId: '-10023340203',
    phoneNumber: '+15198971683'
  }

  const userMeta = {
    username: 'kol_username',
    photoUrl: 'https://randomuser.me/api/portraits/men/64.jpg',
    telegramId: '-10023340203',
    phoneNumber: '+15198971683'
  }

  const user1Meta = {
    username: 'kol_username',
    photoUrl: 'https://randomuser.me/api/portraits/men/64.jpg',
    telegramId: '-10023340203',
    phoneNumber: '+15198971683'
  }

  await repSys.registerUser(userKOLId, userKOL, typeKOL, 1000, JSON.stringify(userKOLMeta))
  await repSys.registerUser(userId, user, typeUser, 0, JSON.stringify(userProjectFounderMeta))
  await repSys.registerUser(user1Id, user1, typeUser, 0, JSON.stringify(userMeta))
  await repSys.registerUser(userProjectFounderId, userProjectFounder, typeProjectFounder, 0, JSON.stringify(user1Meta))

  await milestone.registerProject(project, "project content", { from: userProjectFounder })

  await repSys.writeVotes(project, user, 500)
  await repSys.delegate(project, userKOL, 20, { from: user })
  await repSys.writeVotes(project, user, 1000)
  
  await milestone.addMilestone(project, "milestone #1", { from: userProjectFounder })
  await milestone.addObj(project, 1, "obj #1", { from: userProjectFounder })
  await milestone.addObj(project, 1, "obj #2", { from: userProjectFounder })
  await milestone.activateMilestone(project, 1, { from: userProjectFounder })
  await milestone.finalizeMilestone(project, 1, { from: userProjectFounder })
  await milestone.rateObj(project, 1, 1, 50, "rating for obj #1", { from: userKOL })
  await milestone.rateObj(project, 1, 2, 38, "rating for obj #1", { from: userKOL })

  callback()
}
