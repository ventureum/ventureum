var RepSys = artifacts.require('RepSys')
var Milestone = artifacts.require('Milestone')
const Utils = require('./utils')

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

const projectContent = {
  projectName: 'Blockcloud',
  logo: 'https://icobench.com/images/icos/icons/datablockchain.jpg',
  wideLogo: 'https://icodrops.com/wp-content/uploads/2018/06/Haja-banner.jpg',
  shortDescription: 'A Blockchain-based Advanced TCP/IP Architecture Providing Constant Connectivity for Dynamic Networks',
  video: 'https://www.youtube.com/watch?v=64kQLRZeE_E',
  description: 'While BigData has traditionally been available only to big companies, Blockcloud.io lowers the barrier for entry and expands our potential client base to include small, medium and large businesses around the globe as well as ICOs seeking data for their new ventures.',
  corporationInfo: {
    location: {
      country: 'CA',
      city: 'Toronto'
    },
    team: {
      teamSize: 6,
      members: [
        {
          name: 'Raul Romero',
          title: 'CEO',
          link: 'https://www.google.com'
        }, {
          name: 'Zi Wen Zhang',
          title: 'CTO',
          link: 'https://www.google.com'
        }, {
          name: 'Lawrence Duerson',
          title: 'COO',
          link: 'https://www.google.com'
        }, {
          name: 'Raul Romero',
          title: 'CEO',
          link: 'https://www.google.com'
        }, {
          name: 'Zi Wen Zhang',
          title: 'CTO',
          link: 'https://www.google.com'
        }, {
          name: 'Lawrence Duerson',
          title: 'COO',
          link: 'https://www.google.com'
        }
      ]
    }
  },
  category: 'Artificial Intelligence',
  website: 'https://www.google.com',
  whitepaper: 'https://www.google.com',
  token: {
    symbol: 'BLOC',
    price: '10',
    platform: 'Ethereum',
    accept: ['ETH', 'BTC'],
    KYC: true,
    cantParticipate: ['CN', 'US']
  },
  socialLinks: [
    {
      type: 'telegram',
      link: 'https://www.google.com'
    }, {
      type: 'github',
      link: 'https://www.google.com'
    }, {
      type: 'reddit',
      link: 'https://www.google.com'
    }, {
      type: 'twitter',
      link: 'https://www.google.com'
    }, {
      type: 'facebook',
      link: 'https://www.google.com'
    }, {
      type: 'slack',
      link: 'https://www.google.com'
    }
  ]
}

module.exports = async function (callback) {
  var accounts = await web3.eth.getAccountsPromise()
  var repSys = await RepSys.deployed()
  var milestone = await Milestone.deployed()

  const project = '0x34b0720df51fc665a1a1c2c161c0d5ed75191f138329f83051ad7208fc0a06a2'

  var userKOL = accounts[1]
  var userProjectFounder = accounts[2]
  var user = accounts[3]
  var user1 = accounts[4]
  var userKOL1 = accounts[5]
  var user2 = accounts[6]

  const typeKOL = '0xf4af7c06'
  const typeProjectFounder = '0x5707a2a6'
  const typeUser = '0x2db9fd3d'

  const userKOLId = '0xb69a0b3febe9555482b80f7cc4057e72'
  const userKOL1Id = '0xb69a0b3febe9555482b80f7cc4057e73'
  const userProjectFounderId = '0x381be76e0ae9afae7acb0e9598175ede'
  const userId = '0xcb61ad33d3763aed2bc16c0f57ff251a'
  const user1Id = '0xa1c2b8080ed4b6f56211e0295659ef87'
  const user2Id = '0xa1c2b8080ed4b6f56211e0295659ef88'

  const userKOLMeta = {
    username: 'kol_username',
    photoUrl: 'https://randomuser.me/api/portraits/men/64.jpg',
    telegramId: '-10023340203',
    phoneNumber: '+15198971683',
    'profileContent': '{"shortDescription":"Award-Winning Author | Angel Investor | STO and ICO Advisor | UN Consultant | INSEAD MBA | Advisor Polymath, BitBlock Capital, Fiat Capital Fund | Par","description":"Aly Madhavji (Beijing), Award-Winning Author | Angel Investor | STO and ICO Advisor | UN Consultant | INSEAD MBA | Advisor Polymath, BitBlock Capital, Fiat Capital Fund | Par - having ISS of 34.8 - Aly Madhavji (穆亚霖) is the Managing Partner at the Blockchain Founders Fund, Senior Investment Advisor to BitBlock Capital and Fiat Capital Fund, and a Co-Founder and the Former CEO of Global DCX (rebranded to Alluma), an innovative technology company launching secure digital currency exchanges across emerging markets. He is also an avid investor in early stage companies, digital currencies, and Initial Coin Offerings (ICOs). He has served on various token advisory boards including Polymath, Hurify, Cryptyk and traditional advisory roles including the University of Toronto’s Governing Council. He currently consults organizations such as the United Nations (UN) on FinTech and Blockchain solutions to help alleviate poverty, support business ecosystems, financial inclusion, and improve society at large. He is an internationally acclaimed author, publishing three books, including the award-winning book titled, “Your Guide to Succeed in University”, as part of the Succeed Series. He has lived and worked across 4 continents (North/South America, Europe, and Asia) with PwC, PayPal, Microsoft, Bloomberg, and INSEAD. He also holds the Chartered Professional Accountant, Chartered Accountant, Certified Management Accountant, and Chartered Investment Manager designations. Aly holds a Masters of Global Affairs as a Schwarzman Scholar from Tsinghua University, a Masters in Business Administration from INSEAD (Singapore and France), and a Bachelor of Commerce with Distinction from the University of Toronto.","name":"Aly Madhavji","successScore":34.8}'

  }

  const userKOL1Meta = {
    username: 'kol1_username',
    photoUrl: 'https://randomuser.me/api/portraits/men/64.jpg',
    telegramId: '-10023340203',
    phoneNumber: '+15198971683',
    'profileContent': '{"shortDescription":"Award-Winning Author | Angel Investor | STO and ICO Advisor | UN Consultant | INSEAD MBA | Advisor Polymath, BitBlock Capital, Fiat Capital Fund | Par","description":"Aly Madhavji (Beijing), Award-Winning Author | Angel Investor | STO and ICO Advisor | UN Consultant | INSEAD MBA | Advisor Polymath, BitBlock Capital, Fiat Capital Fund | Par - having ISS of 34.8 - Aly Madhavji (穆亚霖) is the Managing Partner at the Blockchain Founders Fund, Senior Investment Advisor to BitBlock Capital and Fiat Capital Fund, and a Co-Founder and the Former CEO of Global DCX (rebranded to Alluma), an innovative technology company launching secure digital currency exchanges across emerging markets. He is also an avid investor in early stage companies, digital currencies, and Initial Coin Offerings (ICOs). He has served on various token advisory boards including Polymath, Hurify, Cryptyk and traditional advisory roles including the University of Toronto’s Governing Council. He currently consults organizations such as the United Nations (UN) on FinTech and Blockchain solutions to help alleviate poverty, support business ecosystems, financial inclusion, and improve society at large. He is an internationally acclaimed author, publishing three books, including the award-winning book titled, “Your Guide to Succeed in University”, as part of the Succeed Series. He has lived and worked across 4 continents (North/South America, Europe, and Asia) with PwC, PayPal, Microsoft, Bloomberg, and INSEAD. He also holds the Chartered Professional Accountant, Chartered Accountant, Certified Management Accountant, and Chartered Investment Manager designations. Aly holds a Masters of Global Affairs as a Schwarzman Scholar from Tsinghua University, a Masters in Business Administration from INSEAD (Singapore and France), and a Bachelor of Commerce with Distinction from the University of Toronto.","name":"Aly Madhavji","successScore":34.8}'

  }

  const userProjectFounderMeta = {
    username: 'pf_username',
    photoUrl: 'https://randomuser.me/api/portraits/men/64.jpg',
    telegramId: '-10023340203',
    phoneNumber: '+15198971683'
  }

  const userMeta = {
    username: 'user_username',
    photoUrl: 'https://randomuser.me/api/portraits/men/64.jpg',
    telegramId: '-10023340203',
    phoneNumber: '+15198971683'
  }

  const user1Meta = {
    username: 'user1_username',
    photoUrl: 'https://randomuser.me/api/portraits/men/64.jpg',
    telegramId: '-10023340203',
    phoneNumber: '+15198971683'
  }

  const user2Meta = {
    username: 'user2_username',
    photoUrl: 'https://randomuser.me/api/portraits/men/64.jpg',
    telegramId: '-10023340203',
    phoneNumber: '+15198971683'
  }

  const milestone1Content = {
    title: 'milestone #1',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut sed posuere nulla, at bibendum mauris. Nunc aliquam augue quis aliquam porttitor. Ut auctor nunc sit amet dui sodales hendrerit. Sed pulvinar purus at egestas interdum. In et tellus ut dolor lobortis pulvinar. Vivamus lectus ligula, pretium in sapien nec, laoreet pellentesque ligula.',
    expectedStartTime: 1541617885,
    expectedEndTime: 1541717885
  }

  const milestone1Obj1Content = {
    title: 'obj #1',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut sed posuere nulla, at bibendum mauris. Nunc aliquam augue quis aliquam porttitor. Ut auctor nunc sit amet dui sodales hendrerit. Sed pulvinar purus at egestas interdum. In et tellus ut dolor lobortis pulvinar. Vivamus lectus ligula, pretium in sapien nec, laoreet pellentesque ligula.'
  }

  const milestone1Obj2Content = {
    title: 'obj #2',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut sed posuere nulla, at bibendum mauris. Nunc aliquam augue quis aliquam porttitor. Ut auctor nunc sit amet dui sodales hendrerit. Sed pulvinar purus at egestas interdum. In et tellus ut dolor lobortis pulvinar. Vivamus lectus ligula, pretium in sapien nec, laoreet pellentesque ligula.'
  }

  await repSys.registerUser(userKOLId, userKOL, typeKOL, 1000, JSON.stringify(userKOLMeta))
  await repSys.registerUser(userKOL1Id, userKOL1, typeKOL, 2000, JSON.stringify(userKOL1Meta))
  await repSys.registerUser(userId, user, typeUser, 0, JSON.stringify(userMeta))
  await repSys.registerUser(user1Id, user1, typeUser, 0, JSON.stringify(user1Meta))
  await repSys.registerUser(user2Id, user2, typeUser, 0, JSON.stringify(user2Meta))
  await repSys.unregisterUser(user2)
  await repSys.registerUser(userProjectFounderId, userProjectFounder, typeProjectFounder, 0, JSON.stringify(userProjectFounderMeta))

  // register a sample project
  await milestone.registerProject(project, JSON.stringify(projectContent), { from: userProjectFounder })

  await repSys.writeVotes(project, user, 500)
  await repSys.delegate(project, [userKOL, userKOL1], [20, 40], { from: user })

  await repSys.writeVotes(project, user, 1000)

  let objData = Utils.encodeObjData([0, 0], [1, 2], [JSON.stringify(milestone1Obj1Content), JSON.stringify(milestone1Obj2Content)])

  await milestone.addMilestone(project, JSON.stringify(milestone1Content), objData.objMetaCompact, objData.objContent, { from: userProjectFounder })

  await milestone.activateMilestone(project, 1, { from: userProjectFounder })
  await milestone.finalizeMilestone(project, 1, { from: userProjectFounder })
  await milestone.finalizeValidators(project, 1, 2)

  const objComment = JSON.stringify({})
  await milestone.rateObj(project, 1, [1, 5], objComment, { from: userKOL })

  callback()
}
