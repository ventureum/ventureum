import {
  should,
  Web3,
  Error,
  TokenSale,
  ACLHandler,
  ContractAddressHandler,
  Kernel,
  ProjectController
} from '../../constants'
const shared = require('../../shared.js')

const TOTAL_SPEND_MONEY = 1000000
const DEPOSIT_VALUE = 10000
const RATE = 10
const ETH_AMOUNT = 10
const PROJECT_TEST_CI = Web3.utils.keccak256('PROJECT_TEST_CI')

contract('TokenSaleTest', function (accounts) {
  const ROOT = accounts[0]
  const PURCHASER = accounts[2]

  let vetXToken
  let kernel
  let aclHandler
  let contractAddressHandler
  let projectController
  let tokenCollector
  let tokenSale

  before(async function () {
    let context = await shared.run(accounts)
    vetXToken = context.vetXToken
    kernel = context.kernel
    aclHandler = context.aclHandler
    contractAddressHandler = context.contractAddressHandler
    projectController = context.projectController
    tokenCollector = context.tokenCollector
    tokenSale = context.tokenSale

    // give tokenSale permission to speed root's money
    vetXToken.approve(
      tokenCollector.address,
      TOTAL_SPEND_MONEY).should.be.fulfilled
  })

  describe('basic test', function () {
    it('should connected', async function () {
      let result = await tokenSale.isConnected.call()
      result.should.be.equal(true)
    })

    it('should register contract success', async function () {
      let result = await tokenSale.CI.call()
      result.should.be.equal(TokenSale.CI)
    })

    it('should receive correct handler', async function () {
      let result = await tokenSale.handlers.call(
        ACLHandler.CI)
      result.should.be.equal(aclHandler.address)
      result = await tokenSale.handlers.call(
        ContractAddressHandler.CI)
      result.should.be.equal(contractAddressHandler.address)
    })

    it('should receive correct kernel', async function () {
      let result = await tokenSale.kernel.call()
      result.should.be.equal(kernel.address)
    })

    it('should receive status connected', async function () {
      let result = await tokenSale.status.call()
      result.should.be.bignumber.equal(1)
    })
  })

  describe('basic functional test', function () {
    it('should start token sale', async function () {
      projectController.registerProject(
        PROJECT_TEST_CI, ROOT, vetXToken.address).should.be.fulfilled

      const { logs } = await tokenSale.startTokenSale(
        PROJECT_TEST_CI,
        RATE,
        vetXToken.address).should.be.fulfilled
      const event = logs.find(e => e.event === '_StartTokenSale')
      should.exist(event)
      event.args.namespace.should.be.equal(PROJECT_TEST_CI)
      event.args.rate.should.be.bignumber.equal(RATE)
      event.args.token.should.be.equal(vetXToken.address)
    })

    it('should approve transfer for root', async function () {
      const { logs } = await vetXToken.approve(
        tokenCollector.address,
        TOTAL_SPEND_MONEY).should.be.fulfilled
      const event = logs.find(e => e.event === 'Approval')
      should.exist(event)
      event.args.owner.should.be.equal(ROOT)
      event.args.spender.should.be.equal(tokenCollector.address)
      event.args.value.should.be.bignumber.equal(TOTAL_SPEND_MONEY)
    })

    it('should finalize success', async function () {
      const testCI1 = Web3.utils.keccak256('testCI1')
      projectController.registerProject(
        testCI1, ROOT, vetXToken.address).should.be.fulfilled

      await tokenSale.startTokenSale(
        testCI1, RATE, vetXToken.address).should.be.fulfilled
      await tokenSale.finalize(testCI1).should.be.fulfilled
      await tokenSale.buyTokens(
        testCI1, {value: ETH_AMOUNT, from: PURCHASER})
        .should.be.rejectedWith(Error.EVMRevert)
    })

    it('should rejected cause project already finalized', async function () {
      const testCI2 = Web3.utils.keccak256('testCI2')
      projectController.registerProject(
        testCI2, ROOT, vetXToken.address).should.be.fulfilled

      await tokenSale.startTokenSale(
        testCI2, RATE, vetXToken.address).should.be.fulfilled
      await tokenSale.finalize(testCI2).should.be.fulfilled
      await tokenSale.buyTokens(
        testCI2, {value: ETH_AMOUNT, from: PURCHASER})
        .should.be.rejectedWith(Error.EVMRevert)
    })

    it('should rejected cause finalize a finalized project',
      async function () {
        const testCI3 = Web3.utils.keccak256('testCI3')
        projectController.registerProject(
          testCI3, ROOT, vetXToken.address).should.be.fulfilled

        await tokenSale.startTokenSale(
          testCI3, RATE, vetXToken.address).should.be.fulfilled
        await tokenSale.finalize(testCI3).should.be.fulfilled
        await tokenSale.finalize(testCI3)
          .should.be.rejectedWith(Error.EVMRevert)
      })
  })

  describe('advanced testing include branch test', function () {
    before(async function () {
      await tokenCollector.deposit(
        vetXToken.address, DEPOSIT_VALUE).should.be.fulfilled
    })

    it('should buy token success', async function () {
      const PROJECT_CI = Web3.utils.keccak256('advanced1')
      projectController.registerProject(
        PROJECT_CI, ROOT, vetXToken.address).should.be.fulfilled

      await tokenSale.startTokenSale(
        PROJECT_CI, RATE, vetXToken.address).should.be.fulfilled

      const tokenAmount = RATE * ETH_AMOUNT

      const preStoreTokenBalance =
        await tokenCollector.balanceOf.call(
          vetXToken.address)
      const prePurchaserTokenBalance = await vetXToken.balanceOf(
        PURCHASER)

      const { logs } = await tokenSale.buyTokens(
        PROJECT_CI,
        {value: ETH_AMOUNT, from: PURCHASER}).should.be.fulfilled

      const event = logs.find(e => e.event === '_BuyTokens')
      should.exist(event)
      event.args.namespace.should.be.equal(PROJECT_CI)
      event.args.tokenNum.should.be.bignumber.equal(
        RATE * ETH_AMOUNT)
      event.args.ethNum.should.be.bignumber.equal(ETH_AMOUNT)

      const postStoreTokenBalance =
        await tokenCollector.balanceOf.call(
          vetXToken.address)
      const postPurchaserTokenBalance = await vetXToken.balanceOf(
        PURCHASER)

      postStoreTokenBalance.plus(tokenAmount).should.be.bignumber.equal(
        preStoreTokenBalance)
      postPurchaserTokenBalance.minus(tokenAmount)
        .should.be.bignumber.equal(prePurchaserTokenBalance)
    })

    it('should receive avg price equal RATE', async function () {
      const PROJECT_CI = Web3.utils.keccak256('advanced2')
      projectController.registerProject(
        PROJECT_CI, ROOT, vetXToken.address).should.be.fulfilled

      await tokenSale.startTokenSale(
        PROJECT_CI, RATE, vetXToken.address).should.be.fulfilled

      await tokenSale.avgPrice.call(PROJECT_CI)
        .should.be.rejectedWith(Error.EVMRevert)
      await tokenSale.buyTokens(
        PROJECT_CI,
        {value: ETH_AMOUNT, from: PURCHASER}).should.be.fulfilled
      await tokenSale.avgPrice.call(PROJECT_CI)
        .should.be.rejectedWith(Error.EVMRevert)
      await tokenSale.finalize(PROJECT_CI).should.be.fulfilled
      const afterFinalizedAvgPrice = await tokenSale
        .avgPrice.call(PROJECT_CI)

      const randomCI = Kernel.RootCI
      await tokenSale.avgPrice.call(randomCI)
        .should.rejectedWith(Error.EVMRevert)

      afterFinalizedAvgPrice.should.be.bignumber.equal(RATE)
    })

    it('should receive avg price equal zero', async function () {
      const PROJECT_CI = Web3.utils.keccak256('advanced3')
      projectController.registerProject(
        PROJECT_CI, ROOT, vetXToken.address).should.be.fulfilled

      await tokenSale.startTokenSale(
        PROJECT_CI, RATE, vetXToken.address).should.be.fulfilled

      await tokenSale.finalize(PROJECT_CI).should.be.fulfilled
      const afterFinalizedAvgPrice = await tokenSale
        .avgPrice.call(PROJECT_CI)
      afterFinalizedAvgPrice.should.be.bignumber.equal(0)
    })

    it('should rejected cause project already exist', async function () {
      const PROJECT_CI = Web3.utils.keccak256('advanced4')
      projectController.registerProject(
        PROJECT_CI, ROOT, vetXToken.address).should.be.fulfilled

      await tokenSale.startTokenSale(
        PROJECT_CI, RATE, vetXToken.address).should.be.fulfilled

      await tokenSale.startTokenSale(
        PROJECT_CI, 123, vetXToken.address)
        .should.be.rejectedWith(Error.EVMRevert)
    })

    it('should rejected cause project not exist', async function () {
      const PROJECT_CI = Web3.utils.keccak256('advanced5')
      projectController.registerProject(
        PROJECT_CI, ROOT, vetXToken.address).should.be.fulfilled

      await tokenSale.startTokenSale(
        PROJECT_CI, RATE, vetXToken.address)
        .should.be.fulfilled

      await tokenSale.buyTokens(
        Kernel.RootCI, {value: ETH_AMOUNT, from: PURCHASER})
        .should.be.rejectedWith(Error.EVMRevert)
    })

    it('should rejected cause buy too large token', async function () {
      const PROJECT_CI = Web3.utils.keccak256('advanced6')
      projectController.registerProject(
        PROJECT_CI, ROOT, vetXToken.address).should.be.fulfilled

      await tokenSale.startTokenSale(
        PROJECT_CI, RATE, vetXToken.address)
        .should.be.fulfilled
      const storeBalance = await tokenCollector.balanceOf.call(
        vetXToken.address)

      await tokenCollector.withdraw(
        vetXToken.address, ROOT, storeBalance)
      const preStoreTokenBalance = await tokenCollector
        .balanceOf.call(vetXToken.address)
      preStoreTokenBalance.should.be.bignumber.equal(0)
      await tokenSale.buyTokens(
        PROJECT_CI,
        {value: ETH_AMOUNT, from: PURCHASER})
        .should.be.rejectedWith(Error.EVMRevert)
    })

    it('should rejected cause finalize a not exist project',
      async function () {
        const PROJECT_CI = Web3.utils.keccak256('advanced7')
        projectController.registerProject(
          PROJECT_CI, ROOT, vetXToken.address).should.be.fulfilled

        await tokenSale.startTokenSale(
          PROJECT_CI, RATE, vetXToken.address).should.be.fulfilled

        await tokenSale.finalize(Kernel.RootCI)
          .should.be.rejectedWith(Error.EVMRevert)
      })

    it('should rejected cause CAH do not have project controller',
      async function () {
        await contractAddressHandler.unregisterContract(
          ProjectController.CI).should.be.fulfilled
        await tokenSale.finalize(Kernel.RootCI)
          .should.be.rejectedWith(Error.EVMRevert)
        await contractAddressHandler.registerContract(
          ProjectController.CI,
          projectController.address).should.be.fulfilled
      })
  })
})
