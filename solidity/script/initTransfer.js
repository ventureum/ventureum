const rootDir = '../'

const ThirdPartyJsConfig = require(rootDir + 'config/thirdPartyJsConfig.js')
const getContracts = require(rootDir + 'config/deployedContracts.js').getContracts

const _thirdPartyJsConstants = ThirdPartyJsConfig.default()

module.exports = async function (callback) {
  const defaultAccounts = await _thirdPartyJsConstants.ganachiWeb3.eth.getAccounts()
  const accounts = [
    '0xa9B0cF09F88B95cE9596524bD15147f8664B85bF', // Root
    '0x12088237be120f6516287a74fc01b60935b1cf89', // Owner
    '0x99c871d2a36b6965230b6c0ecd259a28da2809e0', // Voter
    '0x41284ee87fed1013ea313caa435ff0fbee887dbf', // Purchaser
    '0xe23abfc1f558aa08cfe664af63c3a214d1f95290', // Regulator1
    '0x7983d0e92ddf62719c44b34aadbf9f8156f97ece', // Regulator2
    '0x628e9a063e05e0ee53a9267ce0157f123804bcc2'  // Regulator3
  ]

  const value = await _thirdPartyJsConstants.ganachiWeb3.utils.toWei("1000000000000000", "ether")

  for (let i = 0; i < accounts.length; i++) {
    await _thirdPartyJsConstants.ganachiWeb3.eth.sendTransaction({
      to: accounts[i],
      from: defaultAccounts[i],
      value: value
    })
  }

  const contracts = await getContracts(artifacts)
  await contracts.mockProjectToken1.transfer(
    accounts[1],
    '1' + '0'.repeat(23)
  )
  console.log("transfer end")
}
