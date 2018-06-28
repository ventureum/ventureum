import {
  should,
  Web3,
  TimeSetter,
  Error,
  ProjectController,
  Kernel} from '../../constants.js'
const shared = require('../../shared.js')

const TOTAL_SPEND_MONEY = 1000000
const DEPOSIT_VALUE = 10000
const RATE = 10
const ETH_AMOUNT = 10
const DEPOSIT_ETH_VALUE = 1000
const MILESTONE_LENGTH = TimeSetter.OneYear
const LAST_WEEK_LENGTH = MILESTONE_LENGTH + 100 - TimeSetter.OneWeek

const OBJS = [Web3.utils.keccak256('obj1')]
const OBJ_TYPES = ['type1']
const OBJ_MAX_REGULATION_REWARDS = [100]

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
    await etherCollector.deposit({value: DEPOSIT_ETH_VALUE})
  })

  describe('advance functional test', function () {
    it('should refund success', async function () {
      const ADVANCE_PROJECT_CI = Web3.utils.keccak256('advance1')
      const refundValue = 100

      await registerAndAcceptProject(ADVANCE_PROJECT_CI)

      await milestoneController.addMilestone(
        ADVANCE_PROJECT_CI,
        MILESTONE_LENGTH,
        OBJS,
        OBJ_TYPES,
        OBJ_MAX_REGULATION_REWARDS).should.be.fulfilled

      await tokenSale.startTokenSale(
        ADVANCE_PROJECT_CI,
        RATE,
        vetXToken.address).should.be.fulfilled

      await tokenCollector.deposit(vetXToken.address, DEPOSIT_VALUE)
        .should.be.fulfilled

      await tokenSale.buyTokens(
        ADVANCE_PROJECT_CI,
        {value: ETH_AMOUNT, from: PURCHASER}).should.be.fulfilled

      await tokenSale.finalize(ADVANCE_PROJECT_CI).should.be.fulfilled

      let state = await projectController.getProjectState(ADVANCE_PROJECT_CI)
      state.should.be.bignumber.equal(ProjectController.State.TokenSale)

      let info = await tokenSale.tokenInfo(ADVANCE_PROJECT_CI)
      info[3].should.be.equal(true)

      await milestoneController.activate(ADVANCE_PROJECT_CI, FIRST_MILESTONE_ID, 0)

      let currentTime = TimeSetter.latestTime()
      await TimeSetter.increaseTimeTo(currentTime + LAST_WEEK_LENGTH)

      await milestoneController.startRefundStage(ADVANCE_PROJECT_CI, FIRST_MILESTONE_ID)
        .should.be.fulfilled

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

      await tokenSale.startTokenSale(
        ADVANCE_PROJECT_CI,
        RATE,
        vetXToken.address).should.be.fulfilled

      await tokenCollector.deposit(vetXToken.address, DEPOSIT_VALUE)
        .should.be.fulfilled

      await tokenSale.buyTokens(
        ADVANCE_PROJECT_CI,
        {value: ETH_AMOUNT, from: PURCHASER}).should.be.fulfilled

      await tokenSale.finalize(ADVANCE_PROJECT_CI).should.be.fulfilled

      await milestoneController.activate(ADVANCE_PROJECT_CI, FIRST_MILESTONE_ID, 0)

      let currentTime = TimeSetter.latestTime()
      await TimeSetter.increaseTimeTo(currentTime + LAST_WEEK_LENGTH)
      await milestoneController.startRefundStage(ADVANCE_PROJECT_CI, FIRST_MILESTONE_ID)
        .should.be.fulfilled

      await refundManager.refund(ADVANCE_PROJECT_CI, FIRST_MILESTONE_ID, refundValue)
        .should.be.fulfilled

      // withdraw
      await refundManager.withdraw(ADVANCE_PROJECT_CI, FIRST_MILESTONE_ID)
        .should.be.rejectedWith(Error.EVMRevert)
      await refundManager.withdraw(Kernel.RootCI, FIRST_MILESTONE_ID)
        .should.be.rejectedWith(Error.EVMRevert)
      await TimeSetter.increaseTimeTo(
        TimeSetter.latestTime() + TimeSetter.OneMonth)

      const { logs } = await refundManager.withdraw(ADVANCE_PROJECT_CI, FIRST_MILESTONE_ID)
        .should.be.fulfilled
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

      await tokenSale.startTokenSale(
        ADVANCE_PROJECT_CI,
        RATE,
        vetXToken.address).should.be.fulfilled

      await tokenCollector.deposit(vetXToken.address, DEPOSIT_VALUE)
        .should.be.fulfilled

      await tokenSale.buyTokens(
        ADVANCE_PROJECT_CI,
        {value: ETH_AMOUNT, from: PURCHASER}).should.be.fulfilled

      await tokenSale.finalize(ADVANCE_PROJECT_CI).should.be.fulfilled

      await milestoneController.activate(ADVANCE_PROJECT_CI, FIRST_MILESTONE_ID, 0)

      await TimeSetter.increaseTimeTo(
        TimeSetter.latestTime() + LAST_WEEK_LENGTH)

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

      await tokenSale.startTokenSale(
        ADVANCE_PROJECT_CI,
        RATE,
        vetXToken.address).should.be.fulfilled

      await tokenCollector.deposit(vetXToken.address, DEPOSIT_VALUE)
        .should.be.fulfilled

      await tokenSale.buyTokens(
        ADVANCE_PROJECT_CI,
        {value: ETH_AMOUNT, from: PURCHASER}).should.be.fulfilled

      await tokenSale.finalize(ADVANCE_PROJECT_CI).should.be.fulfilled

      await milestoneController.activate(ADVANCE_PROJECT_CI, FIRST_MILESTONE_ID, 0)

      let currentTime = TimeSetter.latestTime()
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

      await tokenSale.startTokenSale(
        ADVANCE_PROJECT_CI,
        RATE,
        vetXToken.address).should.be.fulfilled

      await tokenCollector.deposit(vetXToken.address, DEPOSIT_VALUE)
        .should.be.fulfilled

      await tokenSale.finalize(ADVANCE_PROJECT_CI).should.be.fulfilled

      await milestoneController.activate(ADVANCE_PROJECT_CI, FIRST_MILESTONE_ID, 0)

      let currentTime = TimeSetter.latestTime()
      await TimeSetter.increaseTimeTo(currentTime + LAST_WEEK_LENGTH)
      await milestoneController.startRefundStage(ADVANCE_PROJECT_CI, FIRST_MILESTONE_ID)
        .should.be.fulfilled

      await refundManager.refund(ADVANCE_PROJECT_CI, FIRST_MILESTONE_ID, refundValue)
        .should.be.rejectedWith(Error.EVMRevert)
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

      await tokenSale.startTokenSale(
        ADVANCE_PROJECT_CI,
        RATE,
        vetXToken.address).should.be.fulfilled

      await tokenCollector.deposit(vetXToken.address, DEPOSIT_VALUE)
        .should.be.fulfilled

      await tokenSale.buyTokens(
        ADVANCE_PROJECT_CI,
        {value: ETH_AMOUNT, from: PURCHASER}).should.be.fulfilled

      await tokenSale.finalize(ADVANCE_PROJECT_CI).should.be.fulfilled

      await milestoneController.activate(ADVANCE_PROJECT_CI, FIRST_MILESTONE_ID, 0)

      let currentTime = TimeSetter.latestTime()
      await TimeSetter.increaseTimeTo(currentTime + LAST_WEEK_LENGTH)
      await milestoneController.startRefundStage(ADVANCE_PROJECT_CI, FIRST_MILESTONE_ID)
        .should.be.fulfilled

      await refundManager.refund(ADVANCE_PROJECT_CI, FIRST_MILESTONE_ID, refundValue)
        .should.be.fulfilled

      // withdraw
      await refundManager.withdraw(ADVANCE_PROJECT_CI, FIRST_MILESTONE_ID)
        .should.be.rejectedWith(Error.EVMRevert)
      await refundManager.withdraw(ROOT, FIRST_MILESTONE_ID).should.be.rejectedWith(Error.EVMRevert)
      await TimeSetter.increaseTimeTo(TimeSetter.latestTime() + LAST_WEEK_LENGTH)

      const etherCollectorBalance = web3.eth.getBalance(etherCollector.address)
      await etherCollector.withdraw(ROOT, etherCollectorBalance)
      await refundManager.withdraw(ADVANCE_PROJECT_CI, FIRST_MILESTONE_ID)
        .should.be.rejectedWith(Error.EVMRevert)
      await etherCollector.deposit({value: etherCollectorBalance})
    })
  })
})
