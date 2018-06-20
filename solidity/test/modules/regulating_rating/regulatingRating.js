import {should, Web3, TimeSetter, Error, expect} from '../../constants.js'
import {
  ReputationSystem,
} from '../../constants'
const shared = require('../../shared.js')

const TRUE = 1
const FALSE = 0
const PROJECT_ONE = Web3.utils.keccak256('project1');
const PROJECT_TWO = Web3.utils.keccak256('project2');
const MILESTONE_ID_ONE = 1
const MILESTONE_ID_TWO = 2
const MILESTONE_ID_THREE = 3
const MILESTONE_ID_FOUR = 4
const MILESTONE_ID_FIVE = 5
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
const TOTAL_VOTES_LIMIT = 150
const VOTES_IN_WEI_FOR_OBJ_ONE_AND_REGULATOR_ONE = 60
const VOTES_IN_WEI_FOR_OBJ_TWO_AND_REGULATOR_ONE = 20
const VOTES_IN_WEI_FOR_OBJ_ONE_AND_REGULATOR_TWO = 40
const VOTES_IN_WEI_FOR_OBJ_TWO_AND_REGULATOR_TWO = 30
const LENGTH_FOR_RATING_STAGE = 4 * TimeSetter.OneWeek
const INTERVAL_FOR_RATING_STAGE = 2 * TimeSetter.OneWeek
const DELAY_LENGTH_IN_BLOCK_NUMBER = 0
const POLL_LENGTH_IN_BLOCK_NUMBER = 7


contract('RegulatingRatingTest', function (accounts) {
  const ROOT = accounts[0]
  const FOUNDER_ONE = accounts[2]
  const FOUNDER_TWO = accounts[3]
  const REGULATOR_ONE = accounts[4]
  const REGULATOR_TWO = accounts[5]
  const INVESTOR_ONE = accounts[6]
  const INVESTOR_TWO = accounts[7]

  let token
  let projectController
  let regulatingRating
  let reputationSystem
  let milestoneController
  let carbonVoteXCore

  let setUpReputationSystemVote

  before(async function () {
    let context = await shared.run(accounts)
    token = context.token
    projectController = context.projectController
    regulatingRating = context.regulatingRating
    reputationSystem = context.reputationSystem
    milestoneController = context.milestoneController
    carbonVoteXCore = context.carbonVoteXCore

    await reputationSystem.setAddressCanRegister(ROOT)

    await projectController.registerProject(
      PROJECT_ONE,
      FOUNDER_ONE,
      token.address).should.be.fulfilled

    await projectController.registerProject(
      PROJECT_TWO,
      FOUNDER_TWO,
      token.address).should.be.fulfilled

    setUpReputationSystemVote = async function(
      projectId,
      milestoneId,
      delayLength,
      pollLength,
      founder) {
      const currentTime = TimeSetter.latestTime()
      const pollId = Web3.utils.soliditySha3(projectId, milestoneId);
      const pseudoPrice = 1
      const priceGteOne = false
      const minStartTimeForPOllRequest = currentTime
      const maxStartTimeForPOllRequest = currentTime + TimeSetter.OneWeek
      const startTimeForRegulatingRating = maxStartTimeForPOllRequest
        + TimeSetter.OneMonth
      const endTimeForRegulatingRating  = startTimeForRegulatingRating
        +  LENGTH_FOR_RATING_STAGE

      await reputationSystem.registerPollRequest(
        pollId,
        minStartTimeForPOllRequest,
        maxStartTimeForPOllRequest,
        pseudoPrice,
        priceGteOne,
        token.address,
        OBJ_TYPES);

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
        TOTAL_VOTES_LIMIT)

      await carbonVoteXCore.writeAvailableVotes(
        ReputationSystem.CI,
        pollId,
        INVESTOR_TWO,
        TOTAL_VOTES_LIMIT)

      // vote for obj types
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

      await regulatingRating.start(
        projectId,
        milestoneId,
        startTimeForRegulatingRating,
        endTimeForRegulatingRating,
        OBJS,
        OBJ_TYPES,
        OBJ_MAX_REGULATION_REWARDS,
        {from: founder})

      await TimeSetter.increaseTimeTo(startTimeForRegulatingRating
        + INTERVAL_FOR_RATING_STAGE)
    }
  })

  it('should start successfully', async function () {
    let startTime = TimeSetter.latestTime() + TimeSetter.OneWeek
    let endTime = startTime + TimeSetter.OneWeek
    await regulatingRating.start(
      PROJECT_ONE,
      MILESTONE_ID_ONE,
      startTime,
      endTime,
      OBJS,
      OBJ_TYPES,
      OBJ_MAX_REGULATION_REWARDS,
      {from: FOUNDER_ONE})

    const globalObjInfo = await regulatingRating.getGlobalObjInfo.call(
      PROJECT_ONE, MILESTONE_ID_ONE)

    globalObjInfo[0].should.be.bignumber.equal(OBJS.length)
    globalObjInfo[1].should.be.bignumber.equal(startTime)
    globalObjInfo[2].should.be.bignumber.equal(endTime)

    const objInfoOne = await regulatingRating.getObjInfo.call(
      PROJECT_ONE, MILESTONE_ID_ONE, OBJ_ONE)
    objInfoOne[0].should.be.bignumber.equal(1)
    objInfoOne[1].should.be.bignumber.equal(FALSE)
    objInfoOne[2].should.be.equal(OBJ_TYPE_ONE)

    const objRegulationInfoOne = await regulatingRating
      .getObjRegulationInfo.call(PROJECT_ONE, MILESTONE_ID_ONE, OBJ_ONE)
    objRegulationInfoOne[0].should.be.bignumber.equal(
      OBJ_MAX_REGULATION_REWARD_ONE)
    objRegulationInfoOne[1].should.be.bignumber.equal(0)
    objRegulationInfoOne[2].length.should.be.equal(0)

    const objInfoTwo = await regulatingRating.getObjInfo.call(
      PROJECT_ONE, MILESTONE_ID_ONE, OBJ_TWO)
    objInfoTwo[0].should.be.bignumber.equal(2)
    objInfoTwo[1].should.be.bignumber.equal(FALSE)
    objInfoTwo[2].should.be.equal(OBJ_TYPE_TWO)

    const objRegulationInfoTwo = await regulatingRating
      .getObjRegulationInfo.call(PROJECT_ONE, MILESTONE_ID_ONE, OBJ_TWO)
    objRegulationInfoTwo[0].should.be.bignumber.equal(
      OBJ_MAX_REGULATION_REWARD_TWO)
    objRegulationInfoTwo[1].should.be.bignumber.equal(0)
    objRegulationInfoTwo[2].length.should.be.equal(0)
  })

  it('should not start with registering', async function () {
    let startTime = TimeSetter.latestTime() + TimeSetter.OneWeek
    let endTime = startTime + TimeSetter.OneWeek
    await regulatingRating.start(
      PROJECT_TWO,
      MILESTONE_ID_ONE,
      startTime,
      endTime,
      OBJS,
      OBJ_TYPES,
      OBJ_MAX_REGULATION_REWARDS,
      {from: FOUNDER_TWO})

    await regulatingRating.start(
      PROJECT_TWO,
      MILESTONE_ID_ONE,
      startTime,
      endTime,
      OBJS,
      OBJ_TYPES,
      OBJ_MAX_REGULATION_REWARDS,
      {from: FOUNDER_TWO}).should.be.rejectedWith(Error.EVMRevert)
  })

  it('should bid for one objective successfully ' +
    'by one regulator', async function () {
    await setUpReputationSystemVote(
      PROJECT_ONE,
      MILESTONE_ID_TWO,
      DELAY_LENGTH_IN_BLOCK_NUMBER,
      POLL_LENGTH_IN_BLOCK_NUMBER,
      FOUNDER_ONE)
    await regulatingRating.bid(
      PROJECT_ONE, MILESTONE_ID_TWO, OBJ_ONE, {from: REGULATOR_ONE})

    const objInfoOne = await regulatingRating.getObjInfo.call(
      PROJECT_ONE, MILESTONE_ID_TWO, OBJ_ONE)
    objInfoOne[0].should.be.bignumber.equal(1)
    objInfoOne[1].should.be.bignumber.equal(FALSE)
    objInfoOne[2].should.be.equal(OBJ_TYPE_ONE)

    const objRegulationInfoOne = await regulatingRating
      .getObjRegulationInfo.call(PROJECT_ONE, MILESTONE_ID_TWO, OBJ_ONE)
    objRegulationInfoOne[0].should.be.bignumber.equal(
      OBJ_MAX_REGULATION_REWARD_ONE)
    objRegulationInfoOne[1].should.be.bignumber.equal(
      VOTES_IN_WEI_FOR_OBJ_ONE_AND_REGULATOR_ONE)
    expect(objRegulationInfoOne[2]).to.deep.equal(
      [REGULATOR_ONE]);

    const regulatorOneRewardForObjOne = await regulatingRating
      .getRegulationRewardsForRegulator.call(
        PROJECT_ONE, MILESTONE_ID_TWO, OBJ_ONE, REGULATOR_ONE)
    regulatorOneRewardForObjOne.should.be.bignumber.equal(0)
  })

  it('should bid for multiple objectives successfully' +
    ' by one regulator', async function () {
    await setUpReputationSystemVote(
      PROJECT_ONE,
      MILESTONE_ID_THREE,
      DELAY_LENGTH_IN_BLOCK_NUMBER,
      POLL_LENGTH_IN_BLOCK_NUMBER,
      FOUNDER_ONE)
    await regulatingRating.bid(
      PROJECT_ONE, MILESTONE_ID_THREE, OBJ_ONE, {from: REGULATOR_ONE})
    await regulatingRating.bid(
      PROJECT_ONE, MILESTONE_ID_THREE, OBJ_TWO, {from: REGULATOR_ONE})

    const objInfoOne = await regulatingRating.getObjInfo.call(
      PROJECT_ONE, MILESTONE_ID_THREE, OBJ_ONE)
    objInfoOne[0].should.be.bignumber.equal(1)
    objInfoOne[1].should.be.bignumber.equal(FALSE)
    objInfoOne[2].should.be.equal(OBJ_TYPE_ONE)

    const objRegulationInfoOne = await regulatingRating
    .getObjRegulationInfo.call(PROJECT_ONE, MILESTONE_ID_THREE, OBJ_ONE)
    objRegulationInfoOne[0].should.be.bignumber.equal(
      OBJ_MAX_REGULATION_REWARD_ONE)
    objRegulationInfoOne[1].should.be.bignumber.equal(
      VOTES_IN_WEI_FOR_OBJ_ONE_AND_REGULATOR_ONE)
    expect(objRegulationInfoOne[2]).to.deep.equal(
      [REGULATOR_ONE]);

    const regulatorOneRewardForObjOne = await regulatingRating
      .getRegulationRewardsForRegulator.call(
        PROJECT_ONE, MILESTONE_ID_THREE, OBJ_ONE, REGULATOR_ONE)
    regulatorOneRewardForObjOne.should.be.bignumber.equal(0)

    const objInfoTwo = await regulatingRating.getObjInfo.call(
      PROJECT_ONE, MILESTONE_ID_THREE, OBJ_TWO)
    objInfoTwo[0].should.be.bignumber.equal(2)
    objInfoTwo[1].should.be.bignumber.equal(FALSE)
    objInfoTwo[2].should.be.equal(OBJ_TYPE_TWO)

    const objRegulationInfoTwo = await regulatingRating
      .getObjRegulationInfo.call(PROJECT_ONE, MILESTONE_ID_THREE, OBJ_TWO)
    objRegulationInfoTwo[0].should.be.bignumber.equal(
      OBJ_MAX_REGULATION_REWARD_TWO)
    objRegulationInfoTwo[1].should.be.bignumber.equal(
      VOTES_IN_WEI_FOR_OBJ_TWO_AND_REGULATOR_ONE)
    expect(objRegulationInfoTwo[2]).to.deep.equal(
      [REGULATOR_ONE]);

    const regulatorOneRewardForObjTwo = await regulatingRating
      .getRegulationRewardsForRegulator.call(
        PROJECT_ONE, MILESTONE_ID_THREE, OBJ_TWO, REGULATOR_ONE)
    regulatorOneRewardForObjTwo.should.be.bignumber.equal(0)
  })

  it('should bid for multiple objectives successfully ' +
    'by multiple regulators', async function () {
    await setUpReputationSystemVote(
      PROJECT_ONE,
      MILESTONE_ID_FOUR,
      DELAY_LENGTH_IN_BLOCK_NUMBER,
      POLL_LENGTH_IN_BLOCK_NUMBER,
      FOUNDER_ONE)
    await regulatingRating.bid(
      PROJECT_ONE, MILESTONE_ID_FOUR, OBJ_ONE, {from: REGULATOR_ONE})
    await regulatingRating.bid(
      PROJECT_ONE, MILESTONE_ID_FOUR, OBJ_ONE, {from: REGULATOR_TWO})
    await regulatingRating.bid(
      PROJECT_ONE, MILESTONE_ID_FOUR, OBJ_TWO, {from: REGULATOR_ONE})
    await regulatingRating.bid(
      PROJECT_ONE, MILESTONE_ID_FOUR, OBJ_TWO, {from: REGULATOR_TWO})

    const objInfoOne = await regulatingRating.getObjInfo.call(
      PROJECT_ONE, MILESTONE_ID_FOUR, OBJ_ONE)
    objInfoOne[0].should.be.bignumber.equal(1)
    objInfoOne[1].should.be.bignumber.equal(FALSE)
    objInfoOne[2].should.be.equal(OBJ_TYPE_ONE)

    const objRegulationInfoOne = await regulatingRating
      .getObjRegulationInfo.call(PROJECT_ONE, MILESTONE_ID_FOUR, OBJ_ONE)
    objRegulationInfoOne[0].should.be.bignumber.equal(
      OBJ_MAX_REGULATION_REWARD_ONE)
    objRegulationInfoOne[1].should.be.bignumber.equal(
      VOTES_IN_WEI_FOR_OBJ_ONE_AND_REGULATOR_ONE +
        VOTES_IN_WEI_FOR_OBJ_ONE_AND_REGULATOR_TWO)
    expect(objRegulationInfoOne[2]).to.deep.equal(
      [REGULATOR_ONE, REGULATOR_TWO]);

    const regulatorOneRewardForObjOne = await regulatingRating
      .getRegulationRewardsForRegulator.call(
        PROJECT_ONE, MILESTONE_ID_FOUR, OBJ_ONE, REGULATOR_ONE)
    regulatorOneRewardForObjOne.should.be.bignumber.equal(0)
    const regulatorTwoRewardForObjOne = await regulatingRating
      .getRegulationRewardsForRegulator.call(
        PROJECT_ONE, MILESTONE_ID_FOUR, OBJ_ONE, REGULATOR_TWO)
    regulatorTwoRewardForObjOne.should.be.bignumber.equal(0)

    const objInfoTwo = await regulatingRating.getObjInfo.call(
      PROJECT_ONE, MILESTONE_ID_FOUR, OBJ_TWO)
    objInfoTwo[0].should.be.bignumber.equal(2)
    objInfoTwo[1].should.be.bignumber.equal(FALSE)
    objInfoTwo[2].should.be.equal(OBJ_TYPE_TWO)

    const objRegulationInfoTwo = await regulatingRating
      .getObjRegulationInfo.call(PROJECT_ONE, MILESTONE_ID_FOUR, OBJ_TWO)
    objRegulationInfoTwo[0].should.be.bignumber.equal(
      OBJ_MAX_REGULATION_REWARD_TWO)
    objRegulationInfoTwo[1].should.be.bignumber.equal(
      VOTES_IN_WEI_FOR_OBJ_TWO_AND_REGULATOR_ONE +
        VOTES_IN_WEI_FOR_OBJ_TWO_AND_REGULATOR_TWO)
    expect(objRegulationInfoTwo[2]).to.deep.equal(
      [REGULATOR_ONE, REGULATOR_TWO]);

    const regulatorOneRewardForObjTwo = await regulatingRating
      .getRegulationRewardsForRegulator.call(
        PROJECT_ONE, MILESTONE_ID_FOUR, OBJ_ONE, REGULATOR_ONE)
    regulatorOneRewardForObjTwo.should.be.bignumber.equal(0)
    const regulatorTwoRewardForObjTwo = await regulatingRating
      .getRegulationRewardsForRegulator.call(
        PROJECT_ONE, MILESTONE_ID_FOUR, OBJ_ONE, REGULATOR_TWO)
    regulatorTwoRewardForObjTwo.should.be.bignumber.equal(0)
  })

  it('should backOutFromBid successfully', async function () {
    await setUpReputationSystemVote(
      PROJECT_TWO,
      MILESTONE_ID_TWO,
      DELAY_LENGTH_IN_BLOCK_NUMBER,
      POLL_LENGTH_IN_BLOCK_NUMBER,
      FOUNDER_TWO)
    await regulatingRating.bid(
      PROJECT_TWO, MILESTONE_ID_TWO, OBJ_ONE, {from: REGULATOR_ONE})
    await regulatingRating.bid(
      PROJECT_TWO, MILESTONE_ID_TWO, OBJ_ONE, {from: REGULATOR_TWO})
    await regulatingRating.bid(
      PROJECT_TWO, MILESTONE_ID_TWO, OBJ_TWO, {from: REGULATOR_ONE})
    await regulatingRating.bid(
      PROJECT_TWO, MILESTONE_ID_TWO, OBJ_TWO, {from: REGULATOR_TWO})
    await regulatingRating.backOutFromBid(
      PROJECT_TWO, MILESTONE_ID_TWO, OBJ_ONE, {from: REGULATOR_TWO})
    await regulatingRating.backOutFromBid(
      PROJECT_TWO, MILESTONE_ID_TWO, OBJ_TWO, {from: REGULATOR_ONE})
    await regulatingRating.bid(
      PROJECT_TWO, MILESTONE_ID_TWO, OBJ_TWO, {from: REGULATOR_ONE})

    const objInfoOne = await regulatingRating.getObjInfo.call(
      PROJECT_TWO, MILESTONE_ID_TWO, OBJ_ONE)
    objInfoOne[0].should.be.bignumber.equal(1)
    objInfoOne[1].should.be.bignumber.equal(FALSE)
    objInfoOne[2].should.be.equal(OBJ_TYPE_ONE)

    const objRegulationInfoOne = await regulatingRating
      .getObjRegulationInfo.call(PROJECT_TWO, MILESTONE_ID_TWO, OBJ_ONE)
    objRegulationInfoOne[0].should.be.bignumber.equal(
      OBJ_MAX_REGULATION_REWARD_ONE)
    objRegulationInfoOne[1].should.be.bignumber.equal(
      VOTES_IN_WEI_FOR_OBJ_ONE_AND_REGULATOR_ONE)
    expect(objRegulationInfoOne[2]).to.deep.equal(
      [REGULATOR_ONE]);

    const regulatorOneRewardForObjOne = await regulatingRating
      .getRegulationRewardsForRegulator.call(
        PROJECT_TWO, MILESTONE_ID_TWO, OBJ_ONE, REGULATOR_ONE)
    regulatorOneRewardForObjOne.should.be.bignumber.equal(0)
    await regulatingRating.getRegulationRewardsForRegulator.call(
      PROJECT_TWO,
      MILESTONE_ID_TWO,
      OBJ_ONE,
      REGULATOR_TWO).should.be.rejectedWith(Error.EVMRevert)

    const objInfoTwo = await regulatingRating.getObjInfo.call(
      PROJECT_TWO, MILESTONE_ID_TWO, OBJ_TWO)
    objInfoTwo[0].should.be.bignumber.equal(2)
    objInfoTwo[1].should.be.bignumber.equal(FALSE)
    objInfoTwo[2].should.be.equal(OBJ_TYPE_TWO)

    const objRegulationInfoTwo = await regulatingRating
      .getObjRegulationInfo.call(PROJECT_TWO, MILESTONE_ID_TWO, OBJ_TWO)
    objRegulationInfoTwo[0].should.be.bignumber.equal(
      OBJ_MAX_REGULATION_REWARD_TWO)
    objRegulationInfoTwo[1].should.be.bignumber.equal(
      VOTES_IN_WEI_FOR_OBJ_TWO_AND_REGULATOR_TWO +
        VOTES_IN_WEI_FOR_OBJ_TWO_AND_REGULATOR_ONE)
    expect(objRegulationInfoTwo[2]).to.deep.equal(
      [REGULATOR_TWO, REGULATOR_ONE]);

    const regulatorOneRewardForObjTwo = await regulatingRating
      .getRegulationRewardsForRegulator.call(
        PROJECT_TWO, MILESTONE_ID_TWO, OBJ_TWO, REGULATOR_ONE)
    regulatorOneRewardForObjTwo.should.be.bignumber.equal(0)
    const regulatorTwoRewardForObjTwo = await regulatingRating
      .getRegulationRewardsForRegulator.call(
        PROJECT_TWO, MILESTONE_ID_TWO, OBJ_TWO, REGULATOR_TWO)
    regulatorTwoRewardForObjTwo.should.be.bignumber.equal(0)
  })

  it('should finalize one objective successfully by finalizeBidForObj',
    async function () {
    await setUpReputationSystemVote(
      PROJECT_TWO,
      MILESTONE_ID_THREE,
      DELAY_LENGTH_IN_BLOCK_NUMBER,
      POLL_LENGTH_IN_BLOCK_NUMBER,
      FOUNDER_TWO)

    // bid
    await regulatingRating.bid(
      PROJECT_TWO, MILESTONE_ID_THREE, OBJ_ONE, {from: REGULATOR_ONE})
    await regulatingRating.bid(
      PROJECT_TWO, MILESTONE_ID_THREE, OBJ_ONE, {from: REGULATOR_TWO})

    // finalize
    await regulatingRating.finalizeBidForObj(
      PROJECT_TWO, MILESTONE_ID_THREE, OBJ_ONE, {from: FOUNDER_TWO})


    const objInfoOne = await regulatingRating.getObjInfo.call(
      PROJECT_TWO, MILESTONE_ID_THREE, OBJ_ONE)
    objInfoOne[0].should.be.bignumber.equal(1)
    objInfoOne[1].should.be.bignumber.equal(TRUE)
    objInfoOne[2].should.be.equal(OBJ_TYPE_ONE)

    const expectedObjOneTotalReputationVotes =
      VOTES_IN_WEI_FOR_OBJ_ONE_AND_REGULATOR_ONE +
      VOTES_IN_WEI_FOR_OBJ_ONE_AND_REGULATOR_TWO

    const objRegulationInfoOne = await regulatingRating
      .getObjRegulationInfo.call(PROJECT_TWO, MILESTONE_ID_THREE, OBJ_ONE)
    objRegulationInfoOne[0].should.be.bignumber.equal(
      OBJ_MAX_REGULATION_REWARD_ONE)
    objRegulationInfoOne[1].should.be.bignumber.equal(
      expectedObjOneTotalReputationVotes)
    expect(objRegulationInfoOne[2]).to.deep.equal(
      [REGULATOR_ONE, REGULATOR_TWO]);

    const regulatorOneRewardForObjOne = await regulatingRating
      .getRegulationRewardsForRegulator.call(
        PROJECT_TWO, MILESTONE_ID_THREE, OBJ_ONE, REGULATOR_ONE)
    const expectedRegulatorOneRewardForObjOne =
      (VOTES_IN_WEI_FOR_OBJ_ONE_AND_REGULATOR_ONE /
        expectedObjOneTotalReputationVotes) *  (INTERVAL_FOR_RATING_STAGE /
        LENGTH_FOR_RATING_STAGE) * OBJ_MAX_REGULATION_REWARD_ONE
    regulatorOneRewardForObjOne.should.be.bignumber.equal(
      expectedRegulatorOneRewardForObjOne)

    const regulatorTwoRewardForObjOne = await regulatingRating
      .getRegulationRewardsForRegulator.call(
        PROJECT_TWO, MILESTONE_ID_THREE, OBJ_ONE, REGULATOR_TWO)
    const expectedRegulatorTwoRewardForObjOne =
      (VOTES_IN_WEI_FOR_OBJ_ONE_AND_REGULATOR_TWO /
        expectedObjOneTotalReputationVotes) *  (INTERVAL_FOR_RATING_STAGE /
        LENGTH_FOR_RATING_STAGE) * OBJ_MAX_REGULATION_REWARD_ONE
    regulatorTwoRewardForObjOne.should.be.bignumber.equal(
      expectedRegulatorTwoRewardForObjOne)
  })

  it('should finalize one objective successfully by finalizeAllBids',
    async function () {
      await setUpReputationSystemVote(
        PROJECT_TWO,
        MILESTONE_ID_FOUR,
        DELAY_LENGTH_IN_BLOCK_NUMBER,
        POLL_LENGTH_IN_BLOCK_NUMBER,
        FOUNDER_TWO)

      // bid
      await regulatingRating.bid(
        PROJECT_TWO, MILESTONE_ID_FOUR, OBJ_ONE, {from: REGULATOR_ONE})
      await regulatingRating.bid(
        PROJECT_TWO, MILESTONE_ID_FOUR, OBJ_ONE, {from: REGULATOR_TWO})

      // finalize
      await regulatingRating.finalizeAllBids(
        PROJECT_TWO, MILESTONE_ID_FOUR, {from: FOUNDER_TWO})


      const objInfoOne = await regulatingRating.getObjInfo.call(
        PROJECT_TWO, MILESTONE_ID_FOUR, OBJ_ONE)
      objInfoOne[0].should.be.bignumber.equal(1)
      objInfoOne[1].should.be.bignumber.equal(TRUE)
      objInfoOne[2].should.be.equal(OBJ_TYPE_ONE)

      const expectedObjOneTotalReputationVotes =
        VOTES_IN_WEI_FOR_OBJ_ONE_AND_REGULATOR_ONE +
        VOTES_IN_WEI_FOR_OBJ_ONE_AND_REGULATOR_TWO

      const objRegulationInfoOne = await regulatingRating
      .getObjRegulationInfo.call(PROJECT_TWO, MILESTONE_ID_FOUR, OBJ_ONE)
      objRegulationInfoOne[0].should.be.bignumber.equal(
        OBJ_MAX_REGULATION_REWARD_ONE)
      objRegulationInfoOne[1].should.be.bignumber.equal(
        expectedObjOneTotalReputationVotes)
      expect(objRegulationInfoOne[2]).to.deep.equal(
        [REGULATOR_ONE, REGULATOR_TWO]);

      const regulatorOneRewardForObjOne = await regulatingRating
        .getRegulationRewardsForRegulator.call(
          PROJECT_TWO, MILESTONE_ID_FOUR, OBJ_ONE, REGULATOR_ONE)
      const expectedRegulatorOneRewardForObjOne =
        (VOTES_IN_WEI_FOR_OBJ_ONE_AND_REGULATOR_ONE /
          expectedObjOneTotalReputationVotes) *  (INTERVAL_FOR_RATING_STAGE /
        LENGTH_FOR_RATING_STAGE) * OBJ_MAX_REGULATION_REWARD_ONE
      regulatorOneRewardForObjOne.should.be.bignumber.equal(
        expectedRegulatorOneRewardForObjOne)

      const regulatorTwoRewardForObjOne = await regulatingRating
        .getRegulationRewardsForRegulator.call(
          PROJECT_TWO, MILESTONE_ID_FOUR, OBJ_ONE, REGULATOR_TWO)
      const expectedRegulatorTwoRewardForObjOne =
        (VOTES_IN_WEI_FOR_OBJ_ONE_AND_REGULATOR_TWO /
          expectedObjOneTotalReputationVotes) *  (INTERVAL_FOR_RATING_STAGE /
        LENGTH_FOR_RATING_STAGE) * OBJ_MAX_REGULATION_REWARD_ONE
      regulatorTwoRewardForObjOne.should.be.bignumber.equal(
        expectedRegulatorTwoRewardForObjOne)
    })

  it('should finalize multiple objectives successfully', async function () {
    await setUpReputationSystemVote(
      PROJECT_TWO,
      MILESTONE_ID_FIVE,
      DELAY_LENGTH_IN_BLOCK_NUMBER,
      POLL_LENGTH_IN_BLOCK_NUMBER,
      FOUNDER_TWO)

    // bid and backOutFromBid
    await regulatingRating.bid(
      PROJECT_TWO, MILESTONE_ID_FIVE, OBJ_ONE, {from: REGULATOR_ONE})
    await regulatingRating.bid(
      PROJECT_TWO, MILESTONE_ID_FIVE, OBJ_ONE, {from: REGULATOR_TWO})
    await regulatingRating.bid(
      PROJECT_TWO, MILESTONE_ID_FIVE, OBJ_TWO, {from: REGULATOR_ONE})
    await regulatingRating.bid(
      PROJECT_TWO, MILESTONE_ID_FIVE, OBJ_TWO, {from: REGULATOR_TWO})
    await regulatingRating.backOutFromBid(
      PROJECT_TWO, MILESTONE_ID_FIVE, OBJ_ONE, {from: REGULATOR_TWO})
    await regulatingRating.backOutFromBid(
      PROJECT_TWO, MILESTONE_ID_FIVE, OBJ_TWO, {from: REGULATOR_ONE})
    await regulatingRating.bid(
      PROJECT_TWO, MILESTONE_ID_FIVE, OBJ_TWO, {from: REGULATOR_ONE})

    // finalize
    await regulatingRating.finalizeAllBids(
      PROJECT_TWO, MILESTONE_ID_FIVE, {from: FOUNDER_TWO})

    // check OBJ_ONE
    const objInfoOne = await regulatingRating.getObjInfo.call(
      PROJECT_TWO, MILESTONE_ID_FIVE, OBJ_ONE)
    objInfoOne[0].should.be.bignumber.equal(1)
    objInfoOne[1].should.be.bignumber.equal(TRUE)
    objInfoOne[2].should.be.equal(OBJ_TYPE_ONE)

    const expectedObjOneTotalReputationVotes =
      VOTES_IN_WEI_FOR_OBJ_ONE_AND_REGULATOR_ONE

    const objRegulationInfoOne = await regulatingRating
      .getObjRegulationInfo.call(PROJECT_TWO, MILESTONE_ID_FIVE, OBJ_ONE)
    objRegulationInfoOne[0].should.be.bignumber.equal(
      OBJ_MAX_REGULATION_REWARD_ONE)
    objRegulationInfoOne[1].should.be.bignumber.equal(
      expectedObjOneTotalReputationVotes)
    expect(objRegulationInfoOne[2]).to.deep.equal(
      [REGULATOR_ONE]);

    const regulatorOneRewardForObjOne = await regulatingRating
      .getRegulationRewardsForRegulator.call(
        PROJECT_TWO, MILESTONE_ID_FIVE, OBJ_ONE, REGULATOR_ONE)
    const expectedRegulatorOneRewardForObjOne =
      (VOTES_IN_WEI_FOR_OBJ_ONE_AND_REGULATOR_ONE /
        expectedObjOneTotalReputationVotes) *  (INTERVAL_FOR_RATING_STAGE /
      LENGTH_FOR_RATING_STAGE) * OBJ_MAX_REGULATION_REWARD_ONE
    regulatorOneRewardForObjOne.should.be.bignumber.equal(
      expectedRegulatorOneRewardForObjOne)

    await regulatingRating.getRegulationRewardsForRegulator.call(
      PROJECT_TWO,
      MILESTONE_ID_FIVE,
      OBJ_ONE,
      REGULATOR_TWO).should.be.rejectedWith(Error.EVMRevert)


    // check OBJ_TWO
    const objInfoTWO = await regulatingRating.getObjInfo.call(
      PROJECT_TWO, MILESTONE_ID_FIVE, OBJ_TWO)
    objInfoTWO[0].should.be.bignumber.equal(2)
    objInfoTWO[1].should.be.bignumber.equal(TRUE)
    objInfoTWO[2].should.be.equal(OBJ_TYPE_TWO)

    const expectedObjTwoTotalReputationVotes =
      VOTES_IN_WEI_FOR_OBJ_TWO_AND_REGULATOR_ONE +
      VOTES_IN_WEI_FOR_OBJ_TWO_AND_REGULATOR_TWO

    const objRegulationInfoTWo = await regulatingRating
      .getObjRegulationInfo.call(PROJECT_TWO, MILESTONE_ID_FIVE, OBJ_TWO)
    objRegulationInfoTWo[0].should.be.bignumber.equal(
      OBJ_MAX_REGULATION_REWARD_TWO)
    objRegulationInfoTWo[1].should.be.bignumber.equal(
      expectedObjTwoTotalReputationVotes)
    expect(objRegulationInfoTWo[2]).to.deep.equal(
      [REGULATOR_TWO, REGULATOR_ONE]);

    const regulatorOneRewardForObjTwo = await regulatingRating
      .getRegulationRewardsForRegulator.call(
        PROJECT_TWO, MILESTONE_ID_FIVE, OBJ_TWO, REGULATOR_ONE)
    const expectedRegulatorOneRewardForObjTwo =
      (VOTES_IN_WEI_FOR_OBJ_TWO_AND_REGULATOR_ONE /
        expectedObjTwoTotalReputationVotes) *  (INTERVAL_FOR_RATING_STAGE /
      LENGTH_FOR_RATING_STAGE) * OBJ_MAX_REGULATION_REWARD_TWO
    regulatorOneRewardForObjTwo.should.be.bignumber.equal(
      expectedRegulatorOneRewardForObjTwo)

    const regulatorTwoRewardForObjTwo = await regulatingRating
      .getRegulationRewardsForRegulator.call(
        PROJECT_TWO, MILESTONE_ID_FIVE, OBJ_TWO, REGULATOR_TWO)
    const expectedRegulatorTwoRewardForObjTwo =
      (VOTES_IN_WEI_FOR_OBJ_TWO_AND_REGULATOR_TWO /
        expectedObjTwoTotalReputationVotes) *  (INTERVAL_FOR_RATING_STAGE /
      LENGTH_FOR_RATING_STAGE) * OBJ_MAX_REGULATION_REWARD_TWO
    regulatorTwoRewardForObjTwo.should.be.bignumber.equal(
      expectedRegulatorTwoRewardForObjTwo)
  })
})
