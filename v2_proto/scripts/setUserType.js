var RepSys = artifacts.require('RepSys')

const userTypeMapping = {
  '0xf4af7c06': 'KOL',
  '0x5707a2a6': 'PF',
  '0x2db9fd3d': 'USER'
}

module.exports = async function (callback) {
  var repSys = await RepSys.deployed()

  // modifiy the following data
  let regData = {
    uuid: '0xb3089426fa44fad6d167f6e0a3bc999f',
    publicKey: '0xD1A7aAEBc2F2d076Ea8839C2c9B4d328F9bC51E5',
    userType: '0xf4af7c06',
    reputation: '100000',
    meta: {
      username: 'kol_username',
      photoUrl: 'https://randomuser.me/api/portraits/men/64.jpg',
      telegramId: '-10023340203',
      phoneNumber: '+15198971683'
    }
  }

  let { uuid, publicKey, userType, reputation, meta } = regData
  await repSys.registerUser(uuid, publicKey, userType, reputation, JSON.stringify(meta))
}
