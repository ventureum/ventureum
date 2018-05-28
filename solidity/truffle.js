// babel does not transpile js in node_modules, we need to ignore them
require('babel-register')({
  ignore: /node_modules\/(?!openzeppelin-solidity\/test\/helpers)/
})
require('babel-polyfill')

const HDWalletProvider = require('truffle-hdwallet-provider')
const fs = require('fs')

let mnemonic = ''

if (fs.existsSync('mnemonic.txt')) {
  mnemonic = fs.readFileSync('mnemonic.txt').toString().split('\n')[0]
}

module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // for more about customizing your Truffle configuration!
  networks: {
    development: {
      host: '127.0.0.1',
      port: 8545,
      network_id: '*', // Match any network id
      gas: 5000000
    },
    rinkeby: {
      provider: new HDWalletProvider(mnemonic, 'https://rinkeby.infura.io/UIovb3o3e1Q0SRHdLaTZ'),
      network_id: '*',
      gas: 6000000,
      gasPrice: 2000000000
    },
    mainnet: {
      provider: new HDWalletProvider(mnemonic, 'https://mainnet.infura.io/UIovb3o3e1Q0SRHdLaTZ'),
      network_id: '1',
      gas: 7000000,
      gasPrice: 10000000000
    },
    coverage: {
      host: "localhost",
      network_id: "*",
      port: 8555,         // <-- If you change this, also set the port option in .solcover.js.
      gas: 0xfffffffffff, // <-- Use this high gas value
      gasPrice: 0x01      // <-- Use this low gas price
    }
  },
  mocha: {
    reporter: 'eth-gas-reporter',
    reporterOptions: {
      currency: 'USD'
    }
  }
};
