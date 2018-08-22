const rootDir = __dirname + '/../'

import { expect } from 'chai'
import {soliditySHA3} from 'ethereumjs-abi'

const env = require(rootDir + '.env.json')

const truffleInfo = require(rootDir + 'truffle.js')


export default function () {
  const HDWalletProvider = require('truffle-hdwallet-provider')

  const HOST = truffleInfo.networks.development.host
  const PORT = truffleInfo.networks.development.port

  const fs = require('fs')

  const Web3 = require('web3')
  let provider = new Web3.providers.HttpProvider("http://" + HOST + ":" + PORT)

  const ganachiWeb3 = new Web3(provider)
  let wweb3 = ganachiWeb3

  if (env['provider'] == "on") {
    provider = truffleInfo.networks.rinkeby.provider
    wweb3 = new Web3(provider)
  }

  const BigNumber = wweb3.BigNumber
  const should = require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-string'))
    .use(require('chai-bignumber')(BigNumber))
    .should()

  const saltHashVote = function (vote, salt) {
    return `0x${soliditySHA3(['uint', 'uint'], [vote, salt]).toString("hex")}`
  }

  return {
    'wweb3': wweb3,
    'ganachiWeb3': ganachiWeb3,
    'Web3': Web3,
    'should': should,
    'fs': fs,
    'expect': expect,
    'saltHashVote': saltHashVote
  }
}
