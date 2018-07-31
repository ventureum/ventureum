import {
  should,
  Error,
  ACLHandler,
  ContractAddressHandler,
  TokenCollector
} from '../../constants'
const shared = require('../../shared.js')

const NULL_ADDRESS = '0x0'
const TOTAL_SPEND_MONEY = 1000000
const VALUE = 10000
const TEST_KEY = "0x6b6579"

contract('TokenCollectorTest', function (accounts) {
  const ROOT = accounts[0]
  const TEST_ACCOUNT = accounts[2]

  let vetXToken
  let kernel
  let tokenCollector
  let aclHandler
  let contractAddressHandler

  before(async function () {
    let context = await shared.run(accounts)
    vetXToken = context.vetXToken
    kernel = context.kernel
    aclHandler = context.aclHandler
    contractAddressHandler = context.contractAddressHandler
    tokenCollector = context.tokenCollector

    // give tokenCollector permission to speed ROOT"s money
    vetXToken.approve(
      tokenCollector.address,
      TOTAL_SPEND_MONEY).should.be.fulfilled

    // some basic test
    const val = await tokenCollector.balanceOf.call(
      vetXToken.address)
    val.should.be.bignumber.equal(0)
  })

  describe('basic test', function () {
    it('should connected', async function () {
      let result = await tokenCollector.isConnected.call()
      result.should.be.equal(true)
    })

    it('should register contract success', async function () {
      let result = await tokenCollector.CI.call()
      result.should.be.equal(TokenCollector.CI)
    })

    it('should receive correct handler', async function () {
      let result = await tokenCollector.handlers.call(
        ACLHandler.CI)
      result.should.be.equal(aclHandler.address)
      result = await tokenCollector.handlers.call(
        ContractAddressHandler.CI)
      result.should.be.equal(contractAddressHandler.address)
    })

    it('should receive correct kernel', async function () {
      let result = await tokenCollector.kernel.call()
      result.should.be.equal(kernel.address)
    })

    it('should receive status connected', async function () {
      let result = await tokenCollector.status.call()
      result.should.be.bignumber.equal(1)
    })
  })

  describe('branch test', function () {
    it('should rejected cause invalid token address', async function () {
      tokenCollector.balanceOf(NULL_ADDRESS)
        .should.be.rejectedWith(Error.EVMRevert)
      tokenCollector.withdraw(NULL_ADDRESS, ROOT, 0)
        .should.be.rejectedWith(Error.EVMRevert)
      tokenCollector.withdraw(
        vetXToken.address,
        NULL_ADDRESS,
        0).should.be.rejectedWith(Error.EVMRevert)
      tokenCollector.deposit(TEST_KEY, NULL_ADDRESS, 0)
        .should.be.rejectedWith(Error.EVMRevert)
    })

    it('should rejected when withdraw value ' +
      'over balance', async function () {
      let balance = await tokenCollector.balanceOf.call(
        vetXToken.address)
      tokenCollector.withdraw(
        vetXToken.address,
        ROOT,
        balance + 1).should.be.rejectedWith(Error.EVMRevert)
    })
  })

  describe('basic functional test', function () {
    it('should approve success', async function () {
      const { logs } = await vetXToken.approve(
        tokenCollector.address,
        TOTAL_SPEND_MONEY).should.be.fulfilled

      const event = logs.find(e => e.event === 'Approval')
      should.exist(event)
      event.args.owner.should.be.equal(ROOT)
      event.args.spender.should.be.equal(
        tokenCollector.address)
      event.args.value.should.be.bignumber.equal(TOTAL_SPEND_MONEY)
    })

    it('should deposit success', async function () {
      const pre = await vetXToken.balanceOf.call(ROOT)
      await tokenCollector.deposit(TEST_KEY, vetXToken.address, VALUE)
        .should.be.fulfilled
      const post = await vetXToken.balanceOf.call(ROOT)
      pre.minus(post).should.be.bignumber.equal(VALUE)
    })

    it('should withdraw success', async function () {
      const withdrawAmount = 200

      const pre = await vetXToken.balanceOf.call(TEST_ACCOUNT)
      await tokenCollector.deposit(TEST_KEY, vetXToken.address, VALUE)
        .should.be.fulfilled
      const storeBalance = await tokenCollector.balanceOf.call(
        vetXToken.address)

      await tokenCollector.withdraw(
        TEST_KEY,
        vetXToken.address,
        TEST_ACCOUNT, withdrawAmount).should.be.fulfilled
      const post = await vetXToken.balanceOf.call(TEST_ACCOUNT)
      post.minus(pre).should.be.bignumber.equal(withdrawAmount)

      const val = await tokenCollector.balanceOf.call(
        vetXToken.address)
      val.should.be.bignumber.equal(storeBalance - withdrawAmount)
    })
  })
})
