var RepSys = artifacts.require("RepSys")

module.exports = async function (callback) {
  var accounts = await web3.eth.getAccounts()
  var repSys = await RepSys.deployed()

  console.log(accounts)

  const project = "0x34b0720df51fc665a1a1c2c161c0d5ed75191f138329f83051ad7208fc0a06a2"

  var root = accounts[0]
  var userKOL = accounts[1]
  var userProjectFounder = accounts[2]
  var user = accounts[3]
  var user1 = accounts[4]

  const typeKOL = "0xf4af7c06"
  const typeProjectFounder = "0x4b36994b"
  const typeUser = "0x2db9fd3d"

  await repSys.registerUser(userKOL, typeKOL, 1000)
  await repSys.registerUser(user, typeUser, 0)

  await repSys.writeVotes(project, user, 500)
  await repSys.writeVotes(project, user1, 1500)
  rv = await repSys.getDelegation.call(project, user)
  console.log(rv[0].toNumber(), rv[1].toNumber(), rv[2].toNumber())

  await repSys.delegate(project, userKOL, 20, { from: user })
  await repSys.delegate(project, userKOL, 50, { from: user1 })
  rv = await repSys.getDelegation.call(project, userKOL)
  console.log(rv[0].toNumber(), rv[1].toNumber(), rv[2].toNumber())

  rv = await repSys.getDelegation.call(project, user)
  console.log(rv[0].toNumber(), rv[1].toNumber(), rv[2].toNumber())

  rv = await repSys.getDelegation.call(project, user1)
  console.log(rv[0].toNumber(), rv[1].toNumber(), rv[2].toNumber())

  await repSys.delegate(project, userKOL, 10, { from: user })

  rv = await repSys.getDelegation.call(project, userKOL)
  console.log(rv[0].toNumber(), rv[1].toNumber(), rv[2].toNumber())

  rv = await repSys.getDelegation.call(project, user)
  console.log(rv[0].toNumber(), rv[1].toNumber(), rv[2].toNumber())

  await repSys.writeVotes(project, user, 10000)

  rv = await repSys.getDelegation.call(project, userKOL)
  console.log(rv[0].toNumber(), rv[1].toNumber(), rv[2].toNumber())

  callback()
}
