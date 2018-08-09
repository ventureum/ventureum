const rootDir = '../'

const ThirdPartyJsConfig = require(rootDir + 'config/thirdPartyJsConfig.js')
const _thirdPartyJsConstants = ThirdPartyJsConfig.default()

module.exports = async function (callback) {
  const defaultAccounts = await _thirdPartyJsConstants.ganachiWeb3.eth.getAccounts()
  const accounts = [
    '0xa9B0cF09F88B95cE9596524bD15147f8664B85bF', // Root
    '0x12088237BE120f6516287a74fC01B60935B1cf89', // Owner
    '0xB768c3fcdC63e936cf85d9EfA33233481bD78361', // Voter
    '0xa8f54dCfa3644Ffef6893f2485f67C44AA25dEF7', // Purchaser
    '0xc584F41E3c95a33c150B2d70b0332DCa79Bca4Bc', // Regulator1
    '0x8ba09C844899F9eDc81f828d7DbE025e793aF0De', // Regulator2
    '0x3D4f280889a01d3397d97CC49506a343F605dE8e'  // Regulator3
  ]

  const value = await _thirdPartyJsConstants.ganachiWeb3.utils.toWei("1000000000000000", "ether")

  for (let i = 0; i < accounts.length; i++) {
    await _thirdPartyJsConstants.ganachiWeb3.eth.sendTransaction({
      to: accounts[i],
      from: defaultAccounts[i],
      value: value
    })
  }
  console.log("transfer end")
}
