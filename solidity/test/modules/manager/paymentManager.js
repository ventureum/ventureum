import {should, Web3, TimeSetter, Error, MilestoneController} from '../../constants.js'
import { ProjectController } from '../../constants'
const shared = require('../../shared.js')

const PROJECT_ONE = Web3.utils.keccak256('ProjectOne')
const PROJECT_TWO = Web3.utils.keccak256('ProjectTwo')
const PROJECT_THREE = Web3.utils.keccak256('ProjectThree')
const MILESTONE_ID_ONE = 1
const WEI_LOCKED = 100
const TOTAL_SPEND_MONEY = 1000000
const DEPOSIT_VALUE = 10000
const RATE = 10
const ETH_AMOUNT = 10
const DEPOSIT_ETH_VALUE = 1000
const MILESTONE_LENGTH = TimeSetter.OneYear

const OBJS = [Web3.utils.keccak256('obj1')]
const OBJ_TYPES = ['type1']
const OBJ_MAX_REGULATION_REWARDS = [100]

contract('PaymentManagerTest', function (accounts) {
  const FOUNDER = accounts[1]
  const PURCHASER = accounts[2]

  let vetXToken
  let paymentManager
  let projectController
  let milestoneController
  let etherCollector
  let tokenCollector
  let tokenSale
  let setUpMilestone = async function(projectId) {
    await projectController.registerProject(
      projectId,
      FOUNDER,
      vetXToken.address).should.be.fulfilled

    await projectController.setState(
      projectId,
      ProjectController.State.AppAccepted).should.be.fulfilled

    await milestoneController.addMilestone(
      projectId,
      MILESTONE_LENGTH,
      OBJS,
      OBJ_TYPES,
      OBJ_MAX_REGULATION_REWARDS, {from: FOUNDER}).should.be.fulfilled

    await milestoneController.addMilestone(
      projectId,
      MILESTONE_LENGTH,
      OBJS,
      OBJ_TYPES,
      OBJ_MAX_REGULATION_REWARDS, {from: FOUNDER}).should.be.fulfilled

    await tokenSale.startTokenSale(
      projectId,
      RATE,
      vetXToken.address,
      {from: FOUNDER}).should.be.fulfilled

    await tokenCollector.deposit(vetXToken.address, DEPOSIT_VALUE)
      .should.be.fulfilled

    await tokenSale.buyTokens(
      projectId,
      {value: ETH_AMOUNT, from: PURCHASER}).should.be.fulfilled

    await tokenSale.finalize(projectId, {from: FOUNDER}).should.be.fulfilled
  }

  before(async function () {
    let context = await shared.run(accounts)
    vetXToken = context.vetXToken
    paymentManager = context.paymentManager
    projectController = context.projectController
    milestoneController = context.milestoneController
    etherCollector = context.etherCollector
    tokenCollector = context.tokenCollector
    tokenSale = context.tokenSale

    await vetXToken.approve(tokenCollector.address, TOTAL_SPEND_MONEY)
    await vetXToken.approve(paymentManager.address, TOTAL_SPEND_MONEY)
    await etherCollector.deposit({value: DEPOSIT_ETH_VALUE})
  })


  it('should withdraw successfully', async function () {
    let currentTime = TimeSetter.latestTime()
    const minStartTime = currentTime + TimeSetter.OneWeek;
    const maxStartTime = minStartTime + TimeSetter.OneMonth;
    await setUpMilestone(PROJECT_ONE)
    await milestoneController.activate(
      PROJECT_ONE,
      MILESTONE_ID_ONE,
      WEI_LOCKED,
      minStartTime,
      maxStartTime,
      {from: FOUNDER}).should.be.fulfilled
    currentTime = TimeSetter.latestTime()
    await TimeSetter.increaseTimeTo(currentTime + 3 * MILESTONE_LENGTH)

    await milestoneController.adminFinalize(
      PROJECT_ONE, MILESTONE_ID_ONE);

    const milestoneState = await milestoneController.milestoneState.call(
      PROJECT_ONE, MILESTONE_ID_ONE);
    milestoneState.should.be.bignumber.equal(
      MilestoneController.State.COMPLETION)

    await paymentManager.withdraw(
      PROJECT_ONE,
      MILESTONE_ID_ONE,
      {from: FOUNDER}).should.be.fulfilled

    const etherCollectorBalance = await web3.eth.getBalance(
      etherCollector.address)
    etherCollectorBalance.should.be.bignumber.equal(
      DEPOSIT_ETH_VALUE - WEI_LOCKED)

    const weiLocked = await milestoneController.milestoneWeiLocked.call(
      PROJECT_ONE, MILESTONE_ID_ONE);
    weiLocked.should.be.bignumber.equal(0)

  })

  it('should fail to withdraw if milestone state is not COMPLETION',
    async function () {
      await paymentManager.withdraw(
        PROJECT_TWO,
        MILESTONE_ID_ONE,
        {from: FOUNDER}).should.be.rejectedWith(Error.EVMRevert)
  })

  it('should not withdraw if weiLocked is zero',
    async function () {
      let currentTime = TimeSetter.latestTime()
      const minStartTime = currentTime + TimeSetter.OneWeek;
      const maxStartTime = minStartTime + TimeSetter.OneMonth;

      await setUpMilestone(PROJECT_THREE)
      await milestoneController.activate(
        PROJECT_THREE,
        MILESTONE_ID_ONE,
        WEI_LOCKED,
        minStartTime,
        maxStartTime,
        {from: FOUNDER}).should.be.fulfilled

      currentTime = TimeSetter.latestTime()
      await TimeSetter.increaseTimeTo(currentTime + 3 * MILESTONE_LENGTH)

      await milestoneController.adminFinalize(
        PROJECT_THREE, MILESTONE_ID_ONE);

      await paymentManager.withdraw(
        PROJECT_THREE,
        MILESTONE_ID_ONE,
        {from: FOUNDER}).should.be.fulfilled

      await paymentManager.withdraw(
        PROJECT_THREE,
        MILESTONE_ID_ONE,
        {from: FOUNDER}).should.be.rejectedWith(Error.EVMRevert)
  })
})
