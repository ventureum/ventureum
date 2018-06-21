import { expect } from 'chai'

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

  return {
    'wweb3': wweb3,
    'Web3': Web3,
    'should': should,
    'fs': fs,
    'expect': expect
  }
}
