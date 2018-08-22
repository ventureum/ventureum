import {
  should,
  Web3,
  TimeSetter,
  Error,
  ProjectController,
  Kernel} from '../../constants.js'
const shared = require('../../shared.js')

const TOTAL_SPEND_MONEY = 100000000
const DEPOSIT_VALUE = 1000000
const RATE = 10
const ETH_AMOUNT = 1000
const TOKEN_SALE_AMOUNT = 1000000
const MILESTONE_LENGTH = TimeSetter.OneYear
const LAST_WEEK_LENGTH = MILESTONE_LENGTH + 100 - TimeSetter.OneWeek

const OBJS = [Web3.utils.keccak256('obj1')]
const OBJ_TYPES = ['type1']
const OBJ_MAX_REGULATION_REWARDS = [10]

const MAX_REFUND_ETHER = ETH_AMOUNT - OBJ_MAX_REGULATION_REWARDS[0]
const WEI_LOCKED = 100


const FIRST_MILESTONE_ID = 1

contract('RefundManagerTest', function (accounts) {
  const ROOT = accounts[0]
  const PURCHASER = accounts[2]

  let vetXToken
  let refundManager
  let projectController
  let milestoneController
  let etherCollector
  let tokenCollector
  let tokenSale

  let registerAndAcceptProject = async function (namespace) {
    await projectController.registerProject(
      namespace,
      ROOT,
      vetXToken.address).should.be.fulfilled
    await projectController.setState(
      namespace,
      ProjectController.State.AppAccepted).should.be.fulfilled
  }

  before(async function () {
    let context = await shared.run(accounts)
    vetXToken = context.vetXToken
    refundManager = context.refundManager
    projectController = context.projectController
    milestoneController = context.milestoneController
    etherCollector = context.etherCollector
    tokenCollector = context.tokenCollector
    tokenSale = context.tokenSale

    // give tokenSale permission to spend ROOT's money
    await vetXToken.approve(tokenCollector.address, TOTAL_SPEND_MONEY)
    await vetXToken.approve(refundManager.address, TOTAL_SPEND_MONEY)
  })

  describe('advance functional test', function () {
    it('should refund success', async function () {
      const ADVANCE_PROJECT_CI = Web3.utils.keccak256('advance1')
      const refundValue = WEI_LOCKED * RATE

      await registerAndAcceptProject(ADVANCE_PROJECT_CI)

      await milestoneController.addMilestone(
        ADVANCE_PROJECT_CI,
        MILESTONE_LENGTH,
        OBJS,
        OBJ_TYPES,
        OBJ_MAX_REGULATION_REWARDS).should.be.fulfilled

      await vetXToken.approve(tokenSale.address, TOKEN_SALE_AMOUNT)
      await tokenSale.startTokenSale(
        ADVANCE_PROJECT_CI,
        RATE,
        vetXToken.address,
        TOKEN_SALE_AMOUNT).should.be.fulfilled

      await vetXToken.transfer(PURCHASER, ETH_AMOUNT * RATE)
      await vetXToken.approve(tokenSale.address, ETH_AMOUNT * RATE / 100, {from: PURCHASER})
      await tokenSale.buyTokens(
        ADVANCE_PROJECT_CI,
        {value: ETH_AMOUNT, from: PURCHASER}).should.be.fulfilled

      await tokenSale.finalize(ADVANCE_PROJECT_CI).should.be.fulfilled

      let state = await projectController.getProjectState(ADVANCE_PROJECT_CI)
      state.should.be.bignumber.equal(ProjectController.State.TokenSale)

      let info = await tokenSale.tokenInfo(ADVANCE_PROJECT_CI)
      info[3].should.be.equal(true)

      let currentTime = TimeSetter.latestTime()
      const minStartTime = currentTime + TimeSetter.OneWeek;
      const maxStartTime = minStartTime + TimeSetter.OneMonth;

      await milestoneController.activate(
        ADVANCE_PROJECT_CI,
        FIRST_MILESTONE_ID,
        WEI_LOCKED,
        minStartTime,
        maxStartTime)

      await TimeSetter.increaseTimeTo(currentTime + LAST_WEEK_LENGTH)

      await milestoneController.startRefundStage(ADVANCE_PROJECT_CI, FIRST_MILESTONE_ID)
        .should.be.fulfilled

      const refundInfoBeforeRefund = await refundManager.getRefundInfo(
        ADVANCE_PROJECT_CI,
        FIRST_MILESTONE_ID).should.be.fulfilled
      refundInfoBeforeRefund[0].should.be.equal(false)


      // cannot refund more than wei_locked
      await refundManager.refund(ADVANCE_PROJECT_CI, FIRST_MILESTONE_ID, refundValue + 10)
        .should.be.rejectedWith(Error.EVMRevert)

      const { logs } = await refundManager.refund(
        ADVANCE_PROJECT_CI, FIRST_MILESTONE_ID, refundValue).should.be.fulfilled
      const event = logs.find(e => e.event === 'Refund')
      should.exist(event)
      event.args.sender.should.be.equal(ROOT)
      event.args.namespace.should.be.equal(ADVANCE_PROJECT_CI)
      event.args.milestoneId.should.be.bignumber.equal(FIRST_MILESTONE_ID)
      event.args.val.should.be.bignumber.equal(refundValue)
      event.args.ethNum.should.be.bignumber.equal(refundValue / RATE)
      event.args.availableTime
        .should.be.bignumber.above(currentTime + TimeSetter.OneMonth)
    })

    it('should withdraw success', async function () {
      const ADVANCE_PROJECT_CI = Web3.utils.keccak256('advance2')
      const refundValue = 100

      await registerAndAcceptProject(ADVANCE_PROJECT_CI)

      await milestoneController.addMilestone(
        ADVANCE_PROJECT_CI,
        MILESTONE_LENGTH,
        OBJS,
        OBJ_TYPES,
        OBJ_MAX_REGULATION_REWARDS).should.be.fulfilled

      await vetXToken.approve(tokenSale.address, TOKEN_SALE_AMOUNT)
      await tokenSale.startTokenSale(
        ADVANCE_PROJECT_CI,
        RATE,
        vetXToken.address,
        TOKEN_SALE_AMOUNT).should.be.fulfilled

      await vetXToken.transfer(PURCHASER, ETH_AMOUNT * RATE)
      await vetXToken.approve(tokenSale.address, ETH_AMOUNT * RATE / 100, {from: PURCHASER})
      await tokenSale.buyTokens(
        ADVANCE_PROJECT_CI,
        {value: ETH_AMOUNT, from: PURCHASER}).should.be.fulfilled

      await tokenSale.finalize(ADVANCE_PROJECT_CI).should.be.fulfilled

      let currentTime = TimeSetter.latestTime()
      const minStartTime = currentTime + TimeSetter.OneWeek;
      const maxStartTime = minStartTime + TimeSetter.OneMonth;

      await milestoneController.activate(
        ADVANCE_PROJECT_CI,
        FIRST_MILESTONE_ID,
        WEI_LOCKED,
        minStartTime,
        maxStartTime)

      await TimeSetter.increaseTimeTo(currentTime + LAST_WEEK_LENGTH)
      await milestoneController.startRefundStage(ADVANCE_PROJECT_CI, FIRST_MILESTONE_ID)
        .should.be.fulfilled

      await refundManager.refund(ADVANCE_PROJECT_CI, FIRST_MILESTONE_ID, refundValue)
        .should.be.fulfilled

      const refundInfoJustAfterRefund = await refundManager.getRefundInfo(
        ADVANCE_PROJECT_CI, FIRST_MILESTONE_ID).should.be.fulfilled
      refundInfoJustAfterRefund[0].should.be.equal(false)
      refundInfoJustAfterRefund[1].should.be.bignumber.equal(refundValue / RATE)

      // withdraw
      await refundManager.withdraw(ADVANCE_PROJECT_CI, FIRST_MILESTONE_ID)
        .should.be.rejectedWith(Error.EVMRevert)
      await refundManager.withdraw(Kernel.RootCI, FIRST_MILESTONE_ID)
        .should.be.rejectedWith(Error.EVMRevert)
      await TimeSetter.increaseTimeTo(
        TimeSetter.latestTime() + TimeSetter.OneMonth)

      const refundInfoOneMonthAfterRefund = await refundManager.getRefundInfo(
        ADVANCE_PROJECT_CI,
        FIRST_MILESTONE_ID).should.be.fulfilled
      refundInfoOneMonthAfterRefund[0].should.be.equal(true)
      refundInfoOneMonthAfterRefund[1].should.be.bignumber.equal(refundValue / RATE)

      const { logs } = await refundManager.withdraw(
        ADVANCE_PROJECT_CI,
        FIRST_MILESTONE_ID).should.be.fulfilled
      const event = logs.find(e => e.event === 'Withdraw')
      should.exist(event)
      event.args.sender.should.be.equal(ROOT)
      event.args.namespace.should.be.equal(ADVANCE_PROJECT_CI)
      event.args.milestoneId.should.be.bignumber.equal(FIRST_MILESTONE_ID)
      event.args.balance.should.be.bignumber.equal(refundValue / RATE)
    })
  })

  describe('branch test', function () {
    it('should rejected cause already refund', async function () {
      const ADVANCE_PROJECT_CI = Web3.utils.keccak256('branch1')
      const refundValue = 100

      await registerAndAcceptProject(ADVANCE_PROJECT_CI)

      await milestoneController.addMilestone(
        ADVANCE_PROJECT_CI,
        MILESTONE_LENGTH,
        OBJS,
        OBJ_TYPES,
        OBJ_MAX_REGULATION_REWARDS).should.be.fulfilled

      await vetXToken.approve(tokenSale.address, TOKEN_SALE_AMOUNT)
      await tokenSale.startTokenSale(
        ADVANCE_PROJECT_CI,
        RATE,
        vetXToken.address,
        TOKEN_SALE_AMOUNT).should.be.fulfilled

      await vetXToken.transfer(PURCHASER, ETH_AMOUNT * RATE)
      await vetXToken.approve(tokenSale.address, ETH_AMOUNT * RATE / 100, {from: PURCHASER})
      await tokenSale.buyTokens(
        ADVANCE_PROJECT_CI,
        {value: ETH_AMOUNT, from: PURCHASER}).should.be.fulfilled

      await tokenSale.finalize(ADVANCE_PROJECT_CI).should.be.fulfilled

      let currentTime = TimeSetter.latestTime()
      const minStartTime = currentTime + TimeSetter.OneWeek;
      const maxStartTime = minStartTime + TimeSetter.OneMonth;

      await milestoneController.activate(
        ADVANCE_PROJECT_CI,
        FIRST_MILESTONE_ID,
        WEI_LOCKED,
        minStartTime,
        maxStartTime)

      await TimeSetter.increaseTimeTo(currentTime + LAST_WEEK_LENGTH)

      await milestoneController.startRefundStage(ADVANCE_PROJECT_CI, FIRST_MILESTONE_ID)
        .should.be.fulfilled

      await refundManager.refund(ADVANCE_PROJECT_CI, FIRST_MILESTONE_ID, refundValue)
        .should.be.fulfilled
      await refundManager.refund(ADVANCE_PROJECT_CI, FIRST_MILESTONE_ID, refundValue)
        .should.be.rejectedWith(Error.EVMRevert)
    })

    it('should rejected cause milestone not in RP state', async function () {
      const ADVANCE_PROJECT_CI = Web3.utils.keccak256('branch2')
      const refundValue = 100

      await registerAndAcceptProject(ADVANCE_PROJECT_CI)

      await milestoneController.addMilestone(
        ADVANCE_PROJECT_CI,
        MILESTONE_LENGTH,
        OBJS,
        OBJ_TYPES,
        OBJ_MAX_REGULATION_REWARDS).should.be.fulfilled

      await vetXToken.approve(tokenSale.address, TOKEN_SALE_AMOUNT)
      await tokenSale.startTokenSale(
        ADVANCE_PROJECT_CI,
        RATE,
        vetXToken.address,
        TOKEN_SALE_AMOUNT).should.be.fulfilled

      await vetXToken.transfer(PURCHASER, ETH_AMOUNT * RATE)
      await vetXToken.approve(tokenSale.address, ETH_AMOUNT * RATE / 100, {from: PURCHASER})
      await tokenSale.buyTokens(
        ADVANCE_PROJECT_CI,
        {value: ETH_AMOUNT, from: PURCHASER}).should.be.fulfilled

      await tokenSale.finalize(ADVANCE_PROJECT_CI).should.be.fulfilled

      let currentTime = TimeSetter.latestTime()
      const minStartTime = currentTime + TimeSetter.OneWeek;
      const maxStartTime = minStartTime + TimeSetter.OneMonth;

      await milestoneController.activate(
        ADVANCE_PROJECT_CI,
        FIRST_MILESTONE_ID,
        WEI_LOCKED,
        minStartTime,
        maxStartTime)

      await TimeSetter.increaseTimeTo(currentTime + LAST_WEEK_LENGTH)

      await refundManager.refund(ADVANCE_PROJECT_CI, FIRST_MILESTONE_ID, refundValue)
        .should.be.rejectedWith(Error.EVMRevert)
    })

    it('should rejected cause avg price is 0', async function () {
      const ADVANCE_PROJECT_CI = Web3.utils.keccak256('branch3')
      const refundValue = 100

      await registerAndAcceptProject(ADVANCE_PROJECT_CI)

      await milestoneController.addMilestone(
        ADVANCE_PROJECT_CI,
        MILESTONE_LENGTH,
        OBJS,
        OBJ_TYPES,
        OBJ_MAX_REGULATION_REWARDS).should.be.fulfilled

      await vetXToken.approve(tokenSale.address, TOKEN_SALE_AMOUNT)
      await tokenSale.startTokenSale(
        ADVANCE_PROJECT_CI,
        RATE,
        vetXToken.address,
        TOKEN_SALE_AMOUNT).should.be.fulfilled

      await tokenSale.finalize(ADVANCE_PROJECT_CI).should.be.rejectedWith(Error.EVMRevert)
    })

    it("should rejected cause don't have enough balance.", async function () {
      const ADVANCE_PROJECT_CI = Web3.utils.keccak256('branch4')
      const refundValue = 100

      await registerAndAcceptProject(ADVANCE_PROJECT_CI)

      await milestoneController.addMilestone(
        ADVANCE_PROJECT_CI,
        MILESTONE_LENGTH,
        OBJS,
        OBJ_TYPES,
        OBJ_MAX_REGULATION_REWARDS).should.be.fulfilled

      await vetXToken.approve(tokenSale.address, TOKEN_SALE_AMOUNT)
      await tokenSale.startTokenSale(
        ADVANCE_PROJECT_CI,
        RATE,
        vetXToken.address,
        TOKEN_SALE_AMOUNT).should.be.fulfilled

      await vetXToken.transfer(PURCHASER, ETH_AMOUNT * RATE)
      await vetXToken.approve(tokenSale.address, ETH_AMOUNT * RATE / 100, {from: PURCHASER})
      await tokenSale.buyTokens(
        ADVANCE_PROJECT_CI,
        {value: ETH_AMOUNT, from: PURCHASER}).should.be.fulfilled

      await tokenSale.finalize(ADVANCE_PROJECT_CI).should.be.fulfilled

      let currentTime = TimeSetter.latestTime()
      const minStartTime = currentTime + TimeSetter.OneWeek;
      const maxStartTime = minStartTime + TimeSetter.OneMonth;

      await milestoneController.activate(
        ADVANCE_PROJECT_CI,
        FIRST_MILESTONE_ID,
        WEI_LOCKED,
        minStartTime,
        maxStartTime)

      await TimeSetter.increaseTimeTo(currentTime + LAST_WEEK_LENGTH)
      await milestoneController.startRefundStage(ADVANCE_PROJECT_CI, FIRST_MILESTONE_ID)
        .should.be.fulfilled

      await refundManager.refund(ADVANCE_PROJECT_CI, FIRST_MILESTONE_ID, refundValue)
        .should.be.fulfilled

      // withdraw
      await refundManager.withdraw(ADVANCE_PROJECT_CI, FIRST_MILESTONE_ID)
        .should.be.rejectedWith(Error.EVMRevert)
      await refundManager.withdraw(ROOT, FIRST_MILESTONE_ID)
        .should.be.rejectedWith(Error.EVMRevert)
      await TimeSetter.increaseTimeTo(TimeSetter.latestTime() + LAST_WEEK_LENGTH)
    })
  })
})
