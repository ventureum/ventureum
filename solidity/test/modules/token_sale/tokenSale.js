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
const TOKEN_SALE_AMOUNT = 1000;

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

  let registerAndAcceptProject = async function (namespace) {
      await projectController.registerProject(
        namespace, ROOT, vetXToken.address).should.be.fulfilled
      await projectController.setState(
        namespace,
        ProjectController.State.AppAccepted).should.be.fulfilled
  }

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
      await registerAndAcceptProject(PROJECT_TEST_CI)
      await vetXToken.approve(tokenSale.address, TOKEN_SALE_AMOUNT)

      const { logs } = await tokenSale.startTokenSale(
        PROJECT_TEST_CI,
        RATE,
        vetXToken.address,
        TOKEN_SALE_AMOUNT
      ).should.be.fulfilled

      const state = await projectController.getProjectState(PROJECT_TEST_CI).should.be.fulfilled
      state.should.be.bignumber.equal(ProjectController.State.TokenSale)
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
      await registerAndAcceptProject(testCI1)

      await vetXToken.approve(tokenSale.address, TOKEN_SALE_AMOUNT)
      await tokenSale.startTokenSale(
        testCI1, RATE, vetXToken.address, TOKEN_SALE_AMOUNT).should.be.fulfilled
      await tokenSale.finalize(testCI1).should.be.fulfilled
      await vetXToken.approve(tokenSale.address, ETH_AMOUNT * RATE / 100, {from: PURCHASER})
      await tokenSale.buyTokens(
        testCI1, {value: ETH_AMOUNT, from: PURCHASER})
        .should.be.rejectedWith(Error.EVMRevert)

      const tokenAddress = await projectController.getTokenAddress(testCI1)
        .should.be.fulfilled
      tokenAddress.should.be.equal(vetXToken.address)
    })

    it('should rejected cause project already finalized', async function () {
      const testCI2 = Web3.utils.keccak256('testCI2')
      await registerAndAcceptProject(testCI2)

      await vetXToken.approve(tokenSale.address, TOKEN_SALE_AMOUNT)
      await tokenSale.startTokenSale(
        testCI2, RATE, vetXToken.address, TOKEN_SALE_AMOUNT).should.be.fulfilled
      await tokenSale.finalize(testCI2).should.be.fulfilled
      await vetXToken.approve(tokenSale.address, ETH_AMOUNT * RATE / 100, {from: PURCHASER})
      await tokenSale.buyTokens(
        testCI2, {value: ETH_AMOUNT, from: PURCHASER})
        .should.be.rejectedWith(Error.EVMRevert)
    })

    it('should rejected cause finalize a finalized project',
      async function () {
        const testCI3 = Web3.utils.keccak256('testCI3')
        await registerAndAcceptProject(testCI3)

      await vetXToken.approve(tokenSale.address, TOKEN_SALE_AMOUNT)
        await tokenSale.startTokenSale(
          testCI3, RATE, vetXToken.address, TOKEN_SALE_AMOUNT).should.be.fulfilled
        await tokenSale.finalize(testCI3).should.be.fulfilled
        await tokenSale.finalize(testCI3)
          .should.be.rejectedWith(Error.EVMRevert)
      })
  })

  describe('advanced tests', function () {
    it('should buy token success', async function () {
      const PROJECT_CI = Web3.utils.keccak256('advanced1')
      await registerAndAcceptProject(PROJECT_CI)

      await vetXToken.approve(tokenSale.address, TOKEN_SALE_AMOUNT)
      await tokenSale.startTokenSale(
        PROJECT_CI, RATE, vetXToken.address, TOKEN_SALE_AMOUNT).should.be.fulfilled

      const tokenAmount = RATE * ETH_AMOUNT

      await vetXToken.transfer(PURCHASER, ETH_AMOUNT * RATE)

      const preStoreTokenBalance = await tokenCollector.balanceOf.call(vetXToken.address)
      const prePurchaserTokenBalance = await vetXToken.balanceOf(PURCHASER)

      await vetXToken.approve(tokenSale.address, ETH_AMOUNT * RATE / 100, {from: PURCHASER})
      const { logs } = await tokenSale.buyTokens(
        PROJECT_CI,
        {value: ETH_AMOUNT, from: PURCHASER}).should.be.fulfilled

      const event = logs.find(e => e.event === '_BuyTokens')
      should.exist(event)
      event.args.namespace.should.be.equal(PROJECT_CI)
      event.args.tokenNum.should.be.bignumber.equal(
        RATE * ETH_AMOUNT)
      event.args.ethNum.should.be.bignumber.equal(ETH_AMOUNT)

      const postStoreTokenBalance = await tokenCollector.balanceOf.call(vetXToken.address)
      const postPurchaserTokenBalance = await vetXToken.balanceOf(PURCHASER)

      preStoreTokenBalance.minus(postStoreTokenBalance).plus(ETH_AMOUNT * RATE / 100)
        .should.be.bignumber.equal(tokenAmount)
      postPurchaserTokenBalance.minus(prePurchaserTokenBalance).plus(ETH_AMOUNT * RATE / 100)
        .should.be.bignumber.equal(tokenAmount)
    })

    it('should receive avg price equal RATE', async function () {
      const PROJECT_CI = Web3.utils.keccak256('advanced2')
      await registerAndAcceptProject(PROJECT_CI)

      await vetXToken.approve(tokenSale.address, TOKEN_SALE_AMOUNT)
      await tokenSale.startTokenSale(
        PROJECT_CI, RATE, vetXToken.address, TOKEN_SALE_AMOUNT).should.be.fulfilled

      await tokenSale.avgPrice.call(PROJECT_CI).should.be.rejectedWith(Error.EVMRevert)
      await vetXToken.transfer(PURCHASER, ETH_AMOUNT * RATE)
      await vetXToken.approve(tokenSale.address, ETH_AMOUNT * RATE / 100, {from: PURCHASER})
      await tokenSale.buyTokens(
        PROJECT_CI,
        {value: ETH_AMOUNT, from: PURCHASER}).should.be.fulfilled
      await tokenSale.avgPrice.call(PROJECT_CI).should.be.rejectedWith(Error.EVMRevert)
      await tokenSale.finalize(PROJECT_CI).should.be.fulfilled
      const afterFinalizedAvgPrice = await tokenSale.avgPrice.call(PROJECT_CI)

      const randomCI = Kernel.RootCI
      await tokenSale.avgPrice.call(randomCI).should.rejectedWith(Error.EVMRevert)

      afterFinalizedAvgPrice.should.be.bignumber.equal(RATE)
    })

    it('should receive avg price equal zero', async function () {
      const PROJECT_CI = Web3.utils.keccak256('advanced3')
      await registerAndAcceptProject(PROJECT_CI)

      await vetXToken.approve(tokenSale.address, TOKEN_SALE_AMOUNT)
      await tokenSale.startTokenSale(
        PROJECT_CI, RATE, vetXToken.address, TOKEN_SALE_AMOUNT).should.be.fulfilled

      await tokenSale.finalize(PROJECT_CI).should.be.fulfilled
      const afterFinalizedAvgPrice = await tokenSale
        .avgPrice.call(PROJECT_CI)
      afterFinalizedAvgPrice.should.be.bignumber.equal(0)
    })

    /**
     * TODO (@b232wang) we are not provider this feature right now
    it('should withdrawToken success by owner (test tokenInfo)', async function () {
      const PROJECT_CI = Web3.utils.keccak256('advanced4')
      await registerAndAcceptProject(PROJECT_CI)

      await vetXToken.approve(tokenSale.address, TOKEN_SALE_AMOUNT)
      await tokenSale.startTokenSale(
        PROJECT_CI, RATE, vetXToken.address, TOKEN_SALE_AMOUNT).should.be.fulfilled

      await vetXToken.approve(tokenSale.address, ETH_AMOUNT * RATE / 100, {from: PURCHASER})
      await tokenSale.buyTokens(
        PROJECT_CI,
        {value: ETH_AMOUNT, from: PURCHASER}).should.be.fulfilled

      await tokenSale.finalize(PROJECT_CI).should.be.fulfilled

      // test function `tokenInfo`
      const res = await tokenSale.tokenInfo.call(PROJECT_CI)
      res[0].should.be.bignumber.equal(RATE)
      res[1].should.be.bignumber.equal(ETH_AMOUNT * RATE)
      res[2].should.be.bignumber.equal(ETH_AMOUNT)
      res[3].should.be.equal(true)
      res[4].should.be.bignumber.equal(TOKEN_SALE_AMOUNT - ETH_AMOUNT * RATE)

      const preBalTokenCollector = await vetXToken.balanceOf(tokenCollector.address)
      const preBalFounder = await vetXToken.balanceOf(ROOT)
      await tokenSale.withdrawToken(PROJECT_CI).should.be.fulfilled
      const postBalTokenCollector = await vetXToken.balanceOf(tokenCollector.address)
      const postBalFounder = await vetXToken.balanceOf(ROOT)

      postBalFounder.minus(preBalFounder).should.be.bignumber.equal(res[4])
      preBalTokenCollector.minus(postBalTokenCollector).should.be.bignumber.equal(res[4])

      await tokenSale.withdrawToken(PROJECT_CI).should.be.fulfilled
    })
    */
  })


  describe('branch tests', function () {
    it('should rejected cause project already exist', async function () {
      const PROJECT_CI = Web3.utils.keccak256('branch1')
      await registerAndAcceptProject(PROJECT_CI)

      await vetXToken.approve(tokenSale.address, TOKEN_SALE_AMOUNT)
      await tokenSale.startTokenSale(PROJECT_CI, RATE, vetXToken.address, TOKEN_SALE_AMOUNT)
        .should.be.fulfilled

      await tokenSale.startTokenSale(PROJECT_CI, 123, vetXToken.address, TOKEN_SALE_AMOUNT)
        .should.be.rejectedWith(Error.EVMRevert)
    })

    it('should rejected cause project not exist', async function () {
      const PROJECT_CI = Web3.utils.keccak256('branch2')
      await registerAndAcceptProject(PROJECT_CI)

      await vetXToken.approve(tokenSale.address, TOKEN_SALE_AMOUNT)
      await tokenSale.startTokenSale(PROJECT_CI, RATE, vetXToken.address, TOKEN_SALE_AMOUNT)
        .should.be.fulfilled

      await vetXToken.approve(tokenSale.address, ETH_AMOUNT * RATE / 100, {from: PURCHASER})
      await tokenSale.buyTokens(
        Kernel.RootCI, {value: ETH_AMOUNT, from: PURCHASER})
        .should.be.rejectedWith(Error.EVMRevert)
    })

    it('should rejected cause buy too large token', async function () {
      const PROJECT_CI = Web3.utils.keccak256('branch3')
      await registerAndAcceptProject(PROJECT_CI)

      await vetXToken.approve(tokenSale.address, TOKEN_SALE_AMOUNT)
      await tokenSale.startTokenSale(PROJECT_CI, RATE, vetXToken.address, TOKEN_SALE_AMOUNT)
        .should.be.fulfilled

      const MAX_ETH_AMOUNT = TOKEN_SALE_AMOUNT / RATE
      await vetXToken.approve(tokenSale.address, ETH_AMOUNT * RATE / 100, {from: PURCHASER})
      await tokenSale.buyTokens(
        PROJECT_CI,
        {value: MAX_ETH_AMOUNT + 1, from: PURCHASER})
        .should.be.rejectedWith(Error.EVMRevert)
    })

    it('should rejected cause finalize a not exist project', async function () {
      const PROJECT_CI = Web3.utils.keccak256('branch4')
      await registerAndAcceptProject(PROJECT_CI)

      await vetXToken.approve(tokenSale.address, TOKEN_SALE_AMOUNT)
      await tokenSale.startTokenSale(PROJECT_CI, RATE, vetXToken.address, TOKEN_SALE_AMOUNT)
        .should.be.fulfilled

      await tokenSale.finalize(Kernel.RootCI).should.be.rejectedWith(Error.EVMRevert)
    })

    it('should rejected cause CAH do not have project controller', async function () {
      await contractAddressHandler.unregisterContract(ProjectController.CI)
        .should.be.fulfilled
      await tokenSale.finalize(Kernel.RootCI).should.be.rejectedWith(Error.EVMRevert)
      await contractAddressHandler.registerContract(
        ProjectController.CI,
        projectController.address).should.be.fulfilled
    })
  })
})
