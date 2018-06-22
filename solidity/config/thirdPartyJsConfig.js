import { expect } from 'chai'
import {soliditySHA3} from 'ethereumjs-abi'

export default function () {
  const fs = require('fs')
  const Web3 = require('web3')
  const wweb3 = new Web3(
    new Web3.providers.HttpProvider('http://localhost:8545'))
  const BigNumber = wweb3.BigNumber
  const should = require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .should()

  const saltHashVote = function (vote, salt) {
    return `0x${soliditySHA3(['uint', 'uint'], [vote, salt]).toString("hex")}`
  }

  return {
    'wweb3': wweb3,
    'Web3': Web3,
    'should': should,
    'fs': fs,
    'expect': expect,
    'saltHashVote': saltHashVote
  }
}
