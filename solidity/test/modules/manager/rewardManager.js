import {should, Web3, TimeSetter, Error, MilestoneController} from '../../constants.js'
import { expect, ProjectController, ReputationSystem } from '../../constants'
const shared = require('../../shared.js')

const PROJECT_ONE = Web3.utils.keccak256('ProjectOne')
const PROJECT_TWO = Web3.utils.keccak256('ProjectTwo')
const PROJECT_THREE = Web3.utils.keccak256('ProjectThree')
const MILESTONE_ID_ONE = 1
const WEI_LOCKED = 100
const TOTAL_SPEND_MONEY = 1000000
const TOKEN_SALE_AMOUNT = 1000000000
const RATE = 10
const ETH_AMOUNT = 1000
const MILESTONE_LENGTH = TimeSetter.OneYear

const OBJ_MAX_REGULATION_REWARD_ONE = 100;
const OBJ_MAX_REGULATION_REWARD_TWO = 50;
const OBJ_TYPE_ONE = Web3.utils.keccak256("type1")
const OBJ_TYPE_TWO = Web3.utils.keccak256("type2")
const OBJ_ONE = Web3.utils.keccak256('obj1');
const OBJ_TWO = Web3.utils.keccak256('obj2');
const OBJS = [OBJ_ONE, OBJ_TWO]
const OBJ_TYPES = [OBJ_TYPE_ONE, OBJ_TYPE_TWO]
const OBJ_MAX_REGULATION_REWARDS = [
  OBJ_MAX_REGULATION_REWARD_ONE,
  OBJ_MAX_REGULATION_REWARD_TWO,
]

const TOTAL_VOTES_IN_WEI_LIMIT = 150
const VOTES_IN_WEI_FOR_OBJ_ONE_AND_REGULATOR_ONE = 60
const VOTES_IN_WEI_FOR_OBJ_TWO_AND_REGULATOR_ONE = 20
const VOTES_IN_WEI_FOR_OBJ_ONE_AND_REGULATOR_TWO = 40
const VOTES_IN_WEI_FOR_OBJ_TWO_AND_REGULATOR_TWO = 30
const DELAY_LENGTH_IN_BLOCK_NUMBER = 0
const POLL_LENGTH_IN_BLOCK_NUMBER = 7

contract('RewardManagerTest', function (accounts) {
  const FOUNDER = accounts[1]
  const PURCHASER = accounts[2]
  const REGULATOR_ONE = accounts[4]
  const REGULATOR_TWO = accounts[5]
  const INVESTOR_ONE = accounts[6]
  const INVESTOR_TWO = accounts[7]

  let vetXToken
  let rewardManager
  let projectController
  let milestoneController
  let etherCollector
  let tokenCollector
  let tokenSale
  let regulatingRating
  let reputationSystem
  let carbonVoteXCore

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

    await vetXToken.transfer(FOUNDER, TOKEN_SALE_AMOUNT)
    await vetXToken.approve(tokenSale.address, TOKEN_SALE_AMOUNT, {from: FOUNDER})
    await tokenSale.startTokenSale(
      projectId,
      RATE,
      vetXToken.address,
      TOKEN_SALE_AMOUNT,
      {from: FOUNDER}).should.be.fulfilled

    await vetXToken.transfer(PURCHASER, ETH_AMOUNT * RATE)
    await vetXToken.approve(tokenSale.address, ETH_AMOUNT * RATE / 100, {from: PURCHASER})
    await tokenSale.buyTokens(
      projectId,
      {value: ETH_AMOUNT, from: PURCHASER}).should.be.fulfilled

    await tokenSale.finalize(projectId, {from: FOUNDER}).should.be.fulfilled
  }


  let setUpReputationSystemVote = async function(
    projectId,
    milestoneId,
    delayLength,
    pollLength,
    avgPrice) {
    const pollId = Web3.utils.soliditySha3(projectId, milestoneId);

    await reputationSystem.startPoll(
      projectId,
      pollId,
      delayLength,
      pollLength);

    // set up upper vote limit for voters
    await carbonVoteXCore.writeAvailableVotes(
      ReputationSystem.CI,
      pollId,
      INVESTOR_ONE,
      TOTAL_VOTES_IN_WEI_LIMIT * avgPrice)

    await carbonVoteXCore.writeAvailableVotes(
      ReputationSystem.CI,
      pollId,
      INVESTOR_TWO,
      TOTAL_VOTES_IN_WEI_LIMIT * avgPrice)

    //vote for obj types
    await reputationSystem.vote(
      projectId,
      REGULATOR_ONE,
      OBJ_TYPE_ONE,
      pollId,
      VOTES_IN_WEI_FOR_OBJ_ONE_AND_REGULATOR_ONE,
      {from: INVESTOR_ONE})

    await reputationSystem.vote(
      projectId,
      REGULATOR_ONE,
      OBJ_TYPE_TWO,
      pollId,
      VOTES_IN_WEI_FOR_OBJ_TWO_AND_REGULATOR_ONE,
      {from: INVESTOR_TWO})

    await reputationSystem.vote(
      projectId,
      REGULATOR_TWO,
      OBJ_TYPE_ONE,
      pollId,
      VOTES_IN_WEI_FOR_OBJ_ONE_AND_REGULATOR_TWO,
      {from: INVESTOR_TWO})

    await reputationSystem.vote(
      projectId,
      REGULATOR_TWO,
      OBJ_TYPE_TWO,
      pollId,
      VOTES_IN_WEI_FOR_OBJ_TWO_AND_REGULATOR_TWO,
      {from: INVESTOR_ONE})

    const expired = await reputationSystem.pollExpired.call(pollId)
    expired.should.be.equal(true)
  }

  before(async function () {
    let context = await shared.run(accounts)
    vetXToken = context.vetXToken
    rewardManager = context.rewardManager
    projectController = context.projectController
    milestoneController = context.milestoneController
    etherCollector = context.etherCollector
    tokenCollector = context.tokenCollector
    tokenSale = context.tokenSale
    regulatingRating = context.regulatingRating
    reputationSystem = context.reputationSystem
    carbonVoteXCore = context.carbonVoteXCore
    await vetXToken.approve(tokenCollector.address, TOTAL_SPEND_MONEY)
    await vetXToken.approve(rewardManager.address, TOTAL_SPEND_MONEY)
  })


  it('should withdraw successfully', async function () {
    await setUpMilestone(PROJECT_ONE)

    let currentTime = TimeSetter.latestTime()
    const minStartPollTime = currentTime + TimeSetter.duration.days(1);
    const maxStartPollTime = minStartPollTime + TimeSetter.OneWeek;

    const startTime = currentTime;

    await milestoneController.activate(
      PROJECT_ONE,
      MILESTONE_ID_ONE,
      WEI_LOCKED,
      minStartPollTime,
      maxStartPollTime,
      {from: FOUNDER}).should.be.fulfilled

    await TimeSetter.increaseTimeTo(currentTime + TimeSetter.duration.days(2))

    const avgPrice = await tokenSale.avgPrice.call(PROJECT_ONE);

    await setUpReputationSystemVote(
      PROJECT_ONE,
      MILESTONE_ID_ONE,
      DELAY_LENGTH_IN_BLOCK_NUMBER,
      POLL_LENGTH_IN_BLOCK_NUMBER,
      avgPrice)

    await milestoneController.startRatingStage(
      PROJECT_ONE,
      MILESTONE_ID_ONE,
      {from: FOUNDER})

    await regulatingRating.bid(
      PROJECT_ONE, MILESTONE_ID_ONE, OBJ_ONE, {from: REGULATOR_ONE})
    await regulatingRating.bid(
      PROJECT_ONE, MILESTONE_ID_ONE, OBJ_ONE, {from: REGULATOR_TWO})
    await regulatingRating.bid(
      PROJECT_ONE, MILESTONE_ID_ONE, OBJ_TWO, {from: REGULATOR_ONE})
    await regulatingRating.bid(
      PROJECT_ONE, MILESTONE_ID_ONE, OBJ_TWO, {from: REGULATOR_TWO})

    await TimeSetter.increaseTimeTo(
      startTime + MILESTONE_LENGTH - TimeSetter.OneWeek)

    await regulatingRating.finalizeAllBids(
      PROJECT_ONE, MILESTONE_ID_ONE, {from: FOUNDER})

    const expectedObjOneTotalReputationVotesInWei =
      VOTES_IN_WEI_FOR_OBJ_ONE_AND_REGULATOR_ONE +
      VOTES_IN_WEI_FOR_OBJ_ONE_AND_REGULATOR_TWO;

    const expectedObjTwoTotalReputationVotesInWei =
      VOTES_IN_WEI_FOR_OBJ_TWO_AND_REGULATOR_ONE +
      VOTES_IN_WEI_FOR_OBJ_TWO_AND_REGULATOR_TWO;

    const expectedRegulatorOneRewardForObjOne =
      (VOTES_IN_WEI_FOR_OBJ_ONE_AND_REGULATOR_ONE /
        expectedObjOneTotalReputationVotesInWei) * OBJ_MAX_REGULATION_REWARD_ONE

    const expectedRegulatorTwoRewardForObjOne =
      (VOTES_IN_WEI_FOR_OBJ_ONE_AND_REGULATOR_TWO /
        expectedObjOneTotalReputationVotesInWei) * OBJ_MAX_REGULATION_REWARD_ONE

    const expectedRegulatorOneRewardForObjTwo =
      (VOTES_IN_WEI_FOR_OBJ_TWO_AND_REGULATOR_ONE /
        expectedObjTwoTotalReputationVotesInWei) * OBJ_MAX_REGULATION_REWARD_TWO

    const expectedRegulatorTwoRewardForObjTwo =
      (VOTES_IN_WEI_FOR_OBJ_TWO_AND_REGULATOR_TWO /
        expectedObjTwoTotalReputationVotesInWei) * OBJ_MAX_REGULATION_REWARD_TWO


    let initBalance = await web3.eth.getBalance(etherCollector.address)
    await rewardManager.withdraw(
      PROJECT_ONE,
      MILESTONE_ID_ONE,
      OBJ_ONE,
      {from: REGULATOR_ONE})
    let newBalance = await web3.eth.getBalance(etherCollector.address)
    expectedRegulatorOneRewardForObjOne.should.be.bignumber.equal(
      initBalance - newBalance)

    initBalance = newBalance
    await rewardManager.withdraw(
      PROJECT_ONE,
      MILESTONE_ID_ONE,
      OBJ_ONE,
      {from: REGULATOR_TWO})
    newBalance = await web3.eth.getBalance(etherCollector.address)
    expectedRegulatorTwoRewardForObjOne.should.be.bignumber.equal(
      initBalance - newBalance)

    initBalance = newBalance
    await rewardManager.withdraw(
      PROJECT_ONE,
      MILESTONE_ID_ONE,
      OBJ_TWO,
      {from: REGULATOR_TWO})
    newBalance = await web3.eth.getBalance(etherCollector.address)
    expectedRegulatorTwoRewardForObjTwo.should.be.bignumber.equal(
      initBalance - newBalance)

    /*
     * test getRegulationRewardsInfo before withdraw
     */
    const rewardsInfoBeforeWithdraw = await rewardManager.getRegulationRewardsInfo(
      PROJECT_ONE,
      MILESTONE_ID_ONE,
      OBJ_TWO,
      {from: REGULATOR_ONE})
    rewardsInfoBeforeWithdraw[0].should.be.equal(true)
    rewardsInfoBeforeWithdraw[1].should.be.bignumber.equal(expectedRegulatorOneRewardForObjTwo)

    initBalance = newBalance
    await rewardManager.withdraw(
      PROJECT_ONE,
      MILESTONE_ID_ONE,
      OBJ_TWO,
      {from: REGULATOR_ONE})
    newBalance = await web3.eth.getBalance(etherCollector.address)
    expectedRegulatorOneRewardForObjTwo.should.be.bignumber.equal(
      initBalance - newBalance)

    /*
     * test getRegulationRewardsInfo after withdraw
     */
    const rewardsInfoAfterWithdraw = await rewardManager.getRegulationRewardsInfo(
      PROJECT_ONE,
      MILESTONE_ID_ONE,
      OBJ_TWO,
      {from: REGULATOR_ONE})
    rewardsInfoAfterWithdraw[0].should.be.equal(true)
    rewardsInfoAfterWithdraw[1].should.be.bignumber.equal(0)
  })

  it('should fail to withdraw if an objective is not finalized',
    async function () {
      await setUpMilestone(PROJECT_TWO)

      let currentTime = TimeSetter.latestTime()
      const minStartPollTime = currentTime + TimeSetter.duration.days(1);
      const maxStartPollTime = minStartPollTime + TimeSetter.OneWeek;

      await milestoneController.activate(
        PROJECT_TWO,
        MILESTONE_ID_ONE,
        WEI_LOCKED,
        minStartPollTime,
        maxStartPollTime,
        {from: FOUNDER}).should.be.fulfilled

      await TimeSetter.increaseTimeTo(currentTime + TimeSetter.duration.days(2))

      const avgPrice = await tokenSale.avgPrice.call(PROJECT_TWO);

      await setUpReputationSystemVote(
        PROJECT_TWO,
        MILESTONE_ID_ONE,
        DELAY_LENGTH_IN_BLOCK_NUMBER,
        POLL_LENGTH_IN_BLOCK_NUMBER,
        avgPrice)

      await milestoneController.startRatingStage(
        PROJECT_TWO,
        MILESTONE_ID_ONE,
        {from: FOUNDER})

      await regulatingRating.bid(
        PROJECT_TWO, MILESTONE_ID_ONE, OBJ_ONE, {from: REGULATOR_ONE})
      await regulatingRating.bid(
        PROJECT_TWO, MILESTONE_ID_ONE, OBJ_ONE, {from: REGULATOR_TWO})
      await regulatingRating.bid(
        PROJECT_TWO, MILESTONE_ID_ONE, OBJ_TWO, {from: REGULATOR_ONE})
      await regulatingRating.bid(
        PROJECT_TWO, MILESTONE_ID_ONE, OBJ_TWO, {from: REGULATOR_TWO})

    /*
     * test getRegulationRewardsInfo when not finalized
     */
    const rewardsInfoNotFinalized = await rewardManager.getRegulationRewardsInfo(
      PROJECT_TWO,
      MILESTONE_ID_ONE,
      OBJ_TWO,
      {from: REGULATOR_ONE})
    rewardsInfoNotFinalized[0].should.be.equal(false)

      await rewardManager.withdraw(
        PROJECT_TWO,
        MILESTONE_ID_ONE,
        OBJ_TWO,
        {from: REGULATOR_ONE}).should.be.rejectedWith(Error.EVMRevert)
  })

  it('should fail to withdraw if an regulator re-withdraws the same objective',
    async function () {
      await setUpMilestone(PROJECT_THREE)

      let currentTime = TimeSetter.latestTime()
      const minStartPollTime = currentTime + TimeSetter.duration.days(1);
      const maxStartPollTime = minStartPollTime + TimeSetter.OneWeek;

      const startTime = currentTime;

      await milestoneController.activate(
        PROJECT_THREE,
        MILESTONE_ID_ONE,
        WEI_LOCKED,
        minStartPollTime,
        maxStartPollTime,
        {from: FOUNDER}).should.be.fulfilled

      await TimeSetter.increaseTimeTo(currentTime + TimeSetter.duration.days(2))

      const avgPrice = await tokenSale.avgPrice.call(PROJECT_THREE);

      await setUpReputationSystemVote(
        PROJECT_THREE,
        MILESTONE_ID_ONE,
        DELAY_LENGTH_IN_BLOCK_NUMBER,
        POLL_LENGTH_IN_BLOCK_NUMBER,
        avgPrice)

      await milestoneController.startRatingStage(
        PROJECT_THREE,
        MILESTONE_ID_ONE,
        {from: FOUNDER})

      await regulatingRating.bid(
        PROJECT_THREE, MILESTONE_ID_ONE, OBJ_ONE, {from: REGULATOR_ONE})
      await regulatingRating.bid(
        PROJECT_THREE, MILESTONE_ID_ONE, OBJ_ONE, {from: REGULATOR_TWO})
      await regulatingRating.bid(
        PROJECT_THREE, MILESTONE_ID_ONE, OBJ_TWO, {from: REGULATOR_ONE})
      await regulatingRating.bid(
        PROJECT_THREE, MILESTONE_ID_ONE, OBJ_TWO, {from: REGULATOR_TWO})

      await TimeSetter.increaseTimeTo(
        startTime + MILESTONE_LENGTH - TimeSetter.OneWeek)

      await regulatingRating.finalizeAllBids(
        PROJECT_THREE, MILESTONE_ID_ONE, {from: FOUNDER})

      await rewardManager.withdraw(
        PROJECT_THREE,
        MILESTONE_ID_ONE,
        OBJ_ONE,
        {from: REGULATOR_ONE})

      await rewardManager.withdraw(
        PROJECT_THREE,
        MILESTONE_ID_ONE,
        OBJ_ONE,
        {from: REGULATOR_ONE}).should.be.rejectedWith(Error.EVMRevert)
    })
})
