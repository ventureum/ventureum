'use strict'

const OwnSolConfig = require('../config/ownSolConfig.js')
const ThirdPartySolConfig = require('../config/thirdPartySolConfig.js')
const ThirdPartyJsConfig = require('../config/thirdPartyJsConfig.js')

const Configuation = require('../config/configuation.js')
const MigrationConfiguation = require('../config/migrationConfiguation.js')

const duration = require('openzeppelin-solidity/test/helpers/increaseTime').duration

const mockData = require("./mockData.js")

const latestTime = require('./../config/TimeSetter.js').latestTime
const increaseTimeTo = require('./../config/TimeSetter.js').increaseTimeTo
const advanceBlock = require('./../config/TimeSetter.js').advanceBlock

module.exports = function (JumpId, MilestoneId, artifacts, accounts, web3) {
  //Get Constant
  const _ownSolConstants = OwnSolConfig.default(artifacts)
  const _thirdPartySolConstants = ThirdPartySolConfig.default(artifacts)
  const _thirdPartyJsConstants = ThirdPartyJsConfig.default()

  // Own contracts:
  //* VTCR
  const PLCRVoting = _ownSolConstants.PLCRVoting
  const Challenge = _ownSolConstants.Challenge
  const Parameterizer = _ownSolConstants.Parameterizer
  const Registry = _ownSolConstants.Registry

  const RefundManager = _ownSolConstants.RefundManager
  const RewardManager = _ownSolConstants.RewardManager
  const ProjectController = _ownSolConstants.ProjectController
  const MilestoneController = _ownSolConstants.MilestoneController
  const EtherCollector = _ownSolConstants.EtherCollector
  const TokenCollector = _ownSolConstants.TokenCollector
  const RegulatingRating = _ownSolConstants.RegulatingRating
  const TokenSale = _ownSolConstants.TokenSale

  const VetXToken = _thirdPartySolConstants.VetXToken
  const ReputationSystem = _thirdPartySolConstants.ReputationSystem
  const TimeSetter = _thirdPartySolConstants.TimeSetter
  const CarbonVoteX = _thirdPartySolConstants.CarbonVoteX

  const Web3 = _thirdPartyJsConstants.Web3
  const saltHashVote = _thirdPartyJsConstants.saltHashVote
  const wweb3 = _thirdPartyJsConstants.wweb3
  const should = _thirdPartyJsConstants.should

  const BigNumber = require('bignumber.js')

  const data = mockData(artifacts)

  /* ------- MockData ---------- */

  const PROJECT_LIST = data.PROJECT_LIST

  const ETH_AMOUNT = data.ETH_AMOUNT

  const TOKEN_SALE_RATE = data.TOKEN_SALE_RATE

  const SALT = data.SALT
  const VOTE_FOR = data.VOTE_FOR
  const AGAINST = data.AGAINST

  const VOTE_NUMBER = data.VOTE_NUMBER
  const PURCHASER_DEPOSIT = data.PURCHASER_DEPOSIT

  const PROJECT_STATE_NOT_EXIST = data.PROJECT_STATE.NOT_EXIST
  const PROJECT_STATE_APP_SUBMITTED = data.PROJECT_STATE.APP_SUBMITTED
  const PROJECT_STATE_APP_ACCEPTED = data.PROJECT_STATE.APP_ACCEPTED
  const PROJECT_STATE_TOKEN_SALE = data.PROJECT_STATE.TOKEN_SALE
  const PROJECT_STATE_MILESTONE = data.PROJECT_STATE.MILESTONE
  const PROJECT_STATE_COMPLETE = data.PROJECT_STATE.COMPLETE

  const CHALLENGE_DEPOSIT = data.CHALLENGE_DEPOSIT
  const CHALLENGE_REWARD = data.CHALLENGE_REWARD

  /* ----- Milestone Mock Data --------- */
  const MILESTONE_LENGTH = data.MILESTONE_LENGTH
  const MILESTONE_OBJS = data.MILESTONE_OBJS
  const MILESTONE_OBJ_TYPES = data.MILESTONE_OBJ_TYPES
  const MILESTONE_OBJ_MAX_REGULATION_REWARDS = data.MILESTONE_OBJ_MAX_REGULATION_REWARDS
  const MILESTONE_WEI_LOCKED = data.MILESTONE_WEI_LOCKED

  /* ----- RegulatingRating Data --------- */
  const LENGTH_FOR_RATING_STAGE = data.LENGTH_FOR_RATING_STAGE
  const INTERVAL_FOR_RATING_STAGE = data.INTERVAL_FOR_RATING_STAGE
  const DELAY_LENGTH = data.DELAY_LENGTH
  const POLL_LENGTH = data.POLL_LENGTH
  const TOTAL_VOTES_LIMIT = data.TOTAL_VOTES_LIMIT

  /* ----- RegulatingRating Data --------- */
  const PURCHASER1_REFUND = data.PURCHASER1_REFUND
  const PURCHASER2_REFUND = data.PURCHASER2_REFUND
  const PURCHASER3_REFUND = data.PURCHASER3_REFUND


  /* ------- Jump info Data --------- */
  const VTCR_WHITELIST = data.STATES.VTCR_WHITELIST
  const ADD_MILESTONE = data.STATES.ADD_MILESTONE
  const TOKEN_SALE = data.STATES.TOKEN_SALE
  const MILESTONE_BEGIN = data.STATES.MILESTONE_BEGIN
  const MILESTONE_ACTIVATE = data.STATES.MILESTONE_ACTIVATE
  const MILESTONE_REGULATING = data.STATES.MILESTONE_REGULATING
  const MILESTONE_REFUND = data.STATES.MILESTONE_REFUND

  const ROOT = accounts[0]
  const PROJECT_OWNER = accounts[1]
  const CHALLENGER = accounts[2]
  const VOTER1 = accounts[3]
  const VOTER2 = accounts[4]

  const PURCHASER1 = accounts[2]
  const PURCHASER2 = accounts[3]
  const PURCHASER3 = accounts[4]

  const INVESTOR1 = accounts[2]
  const INVESTOR2 = accounts[3]
  const REGULATOR1 = accounts[5]
  const REGULATOR2 = accounts[6]

  // Tokens
  let vetXToken
  let projectToken

  // VTCR
  let registry
  let plcrVoting

  let projectController
  let milestoneController
  let tokenCollector
  let tokenSale
  let regulatingRating
  let carbonVoteXCore
  let reputationSystem
  let etherCollector
  let rewardManager
  let refundManager


  const before = async function () {
    vetXToken = await VetXToken.Self.deployed()

    registry = await Registry.Self.deployed()
    plcrVoting = await PLCRVoting.Self.deployed()

    projectController = await ProjectController.Self.deployed()
    milestoneController = await MilestoneController.Self.deployed()
    tokenCollector = await TokenCollector.Self.deployed()
    tokenSale = await TokenSale.Self.deployed()
    regulatingRating = await RegulatingRating.Self.deployed()
    carbonVoteXCore = await CarbonVoteX.Core.deployed()
    reputationSystem = await ReputationSystem.Self.deployed()
    etherCollector = await EtherCollector.Self.deployed()
    rewardManager = await RewardManager.Self.deployed()
    refundManager = await RefundManager.Self.deployed()


    // init project token and transfer all to project owner
    projectToken = await VetXToken.Self.new(
      VetXToken.initAmount,
      "ProjectToken",
      VetXToken.decimalUnits,
      "PT"
    )
    await projectToken.transfer(PROJECT_OWNER, VetXToken.initAmount)

    // Transfer VTX to voter
    await vetXToken.transfer(VOTER1, VOTE_NUMBER)
    await vetXToken.transfer(VOTER2, VOTE_NUMBER)

    // Transfer Eth to rewardManager
    await etherCollector.deposit({value: ETH_AMOUNT}).should.be.fulfilled
  }

  let deposit = async function (address, vetXTokenNum) {
    const bal = await vetXToken.balanceOf(address)
    if (bal !== 0) {
      await vetXToken.transfer(ROOT, bal, {from: address})
    }
    await vetXToken.transfer(address, vetXTokenNum)
  }

  let applyApplication = async function (projectName) {
    // Transfer minDeposit VTX to project owner
    await vetXToken.transfer(PROJECT_OWNER, Parameterizer.paramDefaults.minDeposit)
    let pre = await vetXToken.balanceOf(PROJECT_OWNER)

    // allow registry transfer minDeposit VTX from project owner
    await vetXToken.approve(
      registry.address,
      Parameterizer.paramDefaults.minDeposit,
      {from: PROJECT_OWNER}).should.be.fulfilled

    await registry.apply(
      projectName,
      Parameterizer.paramDefaults.minDeposit,
      {from: PROJECT_OWNER}).should.be.fulfilled

    let post = await vetXToken.balanceOf(PROJECT_OWNER)
    pre.minus(post).should.be.bignumber.equal(
      Parameterizer.paramDefaults.minDeposit)

    const projectHash = wweb3.utils.keccak256(projectName)
    // set token address
    await projectController.setTokenAddress(
      projectHash,
      projectToken.address
    ).should.be.fulfilled
  }

  let challengeApplication = async function (projectName) {
    // Transfer minDeposit VTX to project owner
    await vetXToken.transfer(CHALLENGER, Parameterizer.paramDefaults.minDeposit)
    let pre = await vetXToken.balanceOf(CHALLENGER)

    // allow registry transfer minDeposit VTX from project owner
    await vetXToken.approve(
      registry.address,
      Parameterizer.paramDefaults.minDeposit,
      {from: CHALLENGER}).should.be.fulfilled

    const { logs } = await registry.challenge(
      projectName,
      {from: CHALLENGER}).should.be.fulfilled
    let post = await vetXToken.balanceOf(CHALLENGER)

    const event = logs.find(e => e.event === "_Challenge")
    const pollId = event.args.pollId
    event.args.challenger.should.be.equal(CHALLENGER)

    pre.minus(post).should.be.bignumber.equal(
      Parameterizer.paramDefaults.minDeposit / 2)
    return pollId
  }

  let voteForChallenge = async function (
    pollId,
    voter,
    choice,
    tokenNum) {
    let secretHash = saltHashVote(choice, SALT)

    await vetXToken.approve(plcrVoting.address, tokenNum, {from: voter})
    await plcrVoting.requestVotingRights(
      tokenNum,
      {from: voter}).should.be.fulfilled

    await plcrVoting.commitVote(
      pollId,
      secretHash,
      tokenNum,
      0,
      {from: voter}).should.be.fulfilled
  }

  let increaseTime = async function (time) {
    //const afterCommit = latestTime(web3) + time + 1
    const afterCommit = web3.eth.getBlock('latest').timestamp + time + 1
    await increaseTimeTo(web3, afterCommit)
    await advanceBlock(web3)
  }

  let revealVote = async function (
    pollId,
    voter,
    choice,
    tokenNum) {
    await plcrVoting.revealVote(
      pollId,
      choice,
      SALT,
      {from: voter}).should.be.fulfilled
  }

  let voterReward = async function (pollId, voter, tokenNum) {
    await registry.claimReward(
      pollId,
      SALT,
      {from: voter}).should.be.fulfilled
    let { logs } = await plcrVoting.withdrawVotingRights(
      tokenNum,
      {from: voter}).should.be.fulfilled
    const event = logs.find(e => e.event === "VotingRightsWithdrawn")
    event.args.voter.should.be.equal(voter)
    event.args.numTokens.should.be.bignumber.equal(tokenNum)
  }

  let mockTokenSale = async function (projectHash, rate, projectToken) {
    // Transfer from PROJECT_OWNER to tokenCollector
    await projectToken.transfer(
      tokenCollector.address,
      VetXToken.initAmount,
      {from: PROJECT_OWNER})

    await deposit(PURCHASER1, PURCHASER_DEPOSIT)
    await deposit(PURCHASER2, PURCHASER_DEPOSIT)
    await deposit(PURCHASER3, PURCHASER_DEPOSIT)

    const purchaser1BalPre = await projectToken.balanceOf(PURCHASER1)
    const purchaser2BalPre = await projectToken.balanceOf(PURCHASER2)
    const purchaser3BalPre = await projectToken.balanceOf(PURCHASER3)

    await tokenSale.startTokenSale(
      projectHash,
      rate,
      projectToken.address,
      {from: PROJECT_OWNER}).should.be.fulfilled

    await tokenSale.buyTokens(
      projectHash,
      {value: PURCHASER_DEPOSIT, from: PURCHASER1})
      .should.be.fulfilled

    await tokenSale.buyTokens(
      projectHash,
      {value: PURCHASER_DEPOSIT, from: PURCHASER2})
      .should.be.fulfilled

    await tokenSale.buyTokens(
      projectHash,
      {value: PURCHASER_DEPOSIT, from: PURCHASER3})
      .should.be.fulfilled

    await tokenSale.finalize(projectHash, {from: PROJECT_OWNER})
      .should.be.fulfilled
    const avgPrice = await tokenSale.avgPrice.call(projectHash)

    const purchaser1BalPost = await projectToken.balanceOf(PURCHASER1)
    const purchaser2BalPost = await projectToken.balanceOf(PURCHASER2)
    const purchaser3BalPost = await projectToken.balanceOf(PURCHASER3)

    purchaser1BalPost.minus(purchaser1BalPre)
      .should.be.bignumber.equal(PURCHASER_DEPOSIT * rate)

    avgPrice.should.be.bignumber.equal(rate)
  }

  let mockAddMilestone = async function (projectHash) {
    for (var i = 0; i < MILESTONE_OBJS.length; i++) {
      await milestoneController.addMilestone(
        projectHash,
        MILESTONE_LENGTH[i],
        MILESTONE_OBJS[i],
        MILESTONE_OBJ_TYPES[i],
        MILESTONE_OBJ_MAX_REGULATION_REWARDS[i],
        {from: PROJECT_OWNER}).should.be.fulfilled
    }
  }

  let repsysVote = async function (projectHash, pollId, voter, objType, regulatorAddress, votes) {
    await carbonVoteXCore.writeAvailableVotes(
      ReputationSystem.CI,
      pollId,
      voter,
      TOTAL_VOTES_LIMIT).should.be.fulfilled

    for (let i = 0; i < votes.length; i++) {
      await reputationSystem.vote(
        projectHash,
        regulatorAddress[i],
        objType[i],
        pollId,
        votes[i],
        {from: voter}).should.be.fulfilled
    }
  }

  let reputationSystemRating = async function (projectHash, milestoneId, pollTime) {
    const startTime = latestTime(web3)
    const votesInvestor1 = [100, 200]
    const votesInvestor2 = [150, 50]

    //-------- set up reputation system vote -----------
    const pollId = Web3.utils.soliditySha3(projectHash, milestoneId)

    await increaseTimeTo(web3, pollTime + TimeSetter.duration.days(1))
    await advanceBlock(web3)

    await reputationSystem.startPoll(
      projectHash,
      pollId,
      DELAY_LENGTH,
      POLL_LENGTH).should.be.fulfilled

    // CarbonVoteX vote for regulator
    await repsysVote(
      projectHash,
      pollId,
      INVESTOR1,
      MILESTONE_OBJ_TYPES[milestoneId - 1],
      [REGULATOR1, REGULATOR2],
      votesInvestor1).should.be.fulfilled

    await repsysVote(
      projectHash,
      pollId,
      INVESTOR2,
      MILESTONE_OBJ_TYPES[milestoneId - 1],
      [REGULATOR2, REGULATOR1],
      votesInvestor2).should.be.fulfilled

    let votingResultForRegulator1Obj1 = await reputationSystem.getVotingResultForMember(
      pollId,
      REGULATOR1,
      MILESTONE_OBJ_TYPES[milestoneId - 1][0])
    votingResultForRegulator1Obj1
      .should.be.bignumber.equal(votesInvestor1[0] * TOKEN_SALE_RATE)

    let votingResultForRegulator2Obj1 = await reputationSystem.getVotingResultForMember(
      pollId,
      REGULATOR2,
      MILESTONE_OBJ_TYPES[milestoneId - 1][0])
    votingResultForRegulator2Obj1
      .should.be.bignumber.equal(votesInvestor2[0] * TOKEN_SALE_RATE)

    let votingResultForRegulator1Obj2 = await reputationSystem.getVotingResultForMember(
      pollId,
      REGULATOR1,
      MILESTONE_OBJ_TYPES[milestoneId - 1][1])
    votingResultForRegulator1Obj2
      .should.be.bignumber.equal(votesInvestor2[1] * TOKEN_SALE_RATE)

    let votingResultForRegulator2Obj2 = await reputationSystem.getVotingResultForMember(
      pollId,
      REGULATOR2,
      MILESTONE_OBJ_TYPES[milestoneId - 1][1])
    votingResultForRegulator2Obj2
      .should.be.bignumber.equal(votesInvestor1[1] * TOKEN_SALE_RATE)

    const expired = await reputationSystem.pollExpired.call(pollId)
    expired.should.be.equal(true)

    // --------- start -------------
    await milestoneController.startRatingStage(
      projectHash,
      milestoneId,
      {from: PROJECT_OWNER}).should.be.fulfilled

    // increase time to starttime + interval for rating stage
    await increaseTimeTo(web3, startTime + INTERVAL_FOR_RATING_STAGE)

    await regulatingRating.bid(
      projectHash,
      milestoneId,
      MILESTONE_OBJS[milestoneId - 1][0],
      {from: REGULATOR1}).should.be.fulfilled

    await regulatingRating.bid(
      projectHash,
      milestoneId,
      MILESTONE_OBJS[milestoneId - 1][1],
      {from: REGULATOR1}).should.be.fulfilled

    await regulatingRating.bid(
      projectHash,
      milestoneId,
      MILESTONE_OBJS[milestoneId - 1][0],
      {from: REGULATOR2}).should.be.fulfilled

    await regulatingRating.bid(
      projectHash,
      milestoneId,
      MILESTONE_OBJS[milestoneId - 1][1],
      {from: REGULATOR2}).should.be.fulfilled

    // fastForwardToLastThreeWeek
    const lastWeek = pollTime + MILESTONE_LENGTH[milestoneId - 1] + 100 - 3 * TimeSetter.OneWeek
    await increaseTimeTo(web3, lastWeek)
    await advanceBlock(web3)

    // finalize bid  (founderOnly)
    await regulatingRating.finalizeAllBids(
      projectHash,
      milestoneId,
      {from: PROJECT_OWNER})

    const regulator1Reward =
      [votesInvestor1[0] /
        (votesInvestor1[0] + votesInvestor2[0]) *
        MILESTONE_OBJ_MAX_REGULATION_REWARDS[milestoneId - 1][0],
        votesInvestor2[1] /
        (votesInvestor1[1] + votesInvestor2[1]) *
        MILESTONE_OBJ_MAX_REGULATION_REWARDS[milestoneId - 1][1]]

    const regulator2Reward =
      [votesInvestor2[0] /
        (votesInvestor1[0] + votesInvestor2[0]) *
        MILESTONE_OBJ_MAX_REGULATION_REWARDS[milestoneId - 1][0],
        votesInvestor1[1] /
        (votesInvestor1[1] + votesInvestor2[1]) *
        MILESTONE_OBJ_MAX_REGULATION_REWARDS[milestoneId - 1][1]]

    // test whole rating system and withdraw
    let preBal, postBal
    const REGULATORS = [REGULATOR1, REGULATOR2]
    const REWARDS = [regulator1Reward, regulator2Reward]
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        preBal = await web3.eth.getBalance(etherCollector.address)
        await rewardManager.withdraw(
          projectHash,
          milestoneId,
          MILESTONE_OBJS[milestoneId - 1][i],
          {from: REGULATORS[j]})
        postBal = await web3.eth.getBalance(etherCollector.address)
        preBal.minus(postBal).should.be.bignumber.equal(REWARDS[j][i])
      }
    }
  }


  let refund = async function (projectHash, milestoneId, startTime) {
    await fastForwardToLastWeek(milestoneId, startTime)

    // any investor can start the refund stage
    await milestoneController.startRefundStage(
      projectHash,
      milestoneId,
      {from: PURCHASER1}).should.be.fulfilled

    // purchasers  refund
    const refundTable = [PURCHASER1_REFUND, PURCHASER2_REFUND, PURCHASER3_REFUND]
    const purchasers = [PURCHASER1, PURCHASER2, PURCHASER3]
    for (var i = 0; i < refundTable.length; i++) {
      await projectToken.approve(
        refundManager.address,
        refundTable[i][milestoneId - 1],
        {from: purchasers[i]}).should.be.fulfilled

      await refundManager.refund(
        projectHash,
        milestoneId,
        refundTable[i][milestoneId - 1],
        {from: purchasers[i]}).should.be.fulfilled

      // if not the first milestone, withdraw last milestone's refund
      if (milestoneId != 1) {
        const preBal = await web3.eth.getBalance(etherCollector.address)
        await refundManager.withdraw(
          projectHash,
          milestoneId - 1,
          {from: purchasers[i]}).should.be.fulfilled
        const postBal = await web3.eth.getBalance(etherCollector.address)

        preBal.minus(postBal).should.be.bignumber.equal(
          refundTable[i][milestoneId - 2] / TOKEN_SALE_RATE)
      }
    }
  }

  let fastForwardToEndOfMilestone = async function (milestoneId, startTime) {
    const endMilestone = startTime + MILESTONE_LENGTH[milestoneId - 1] + 100
    await increaseTimeTo(web3, endMilestone)
    await advanceBlock(web3)
  }

  let fastForwardToLastWeek = async function (milestoneId, startTime) {
    const lastWeek = startTime + MILESTONE_LENGTH[milestoneId - 1] + 100 - TimeSetter.OneWeek
    await increaseTimeTo(web3, lastWeek)
    await advanceBlock(web3)
  }

  let main = async function () {
    await before()

    const projectHash = wweb3.utils.keccak256(PROJECT_LIST[0])
    let res;

    /* ---------- VTCR part -------------*/
    await applyApplication(PROJECT_LIST[0])

    if (JumpId == VTCR_WHITELIST) return

    //get and check project info
    res = await projectController.getProjectInfo(projectHash)

    res[0].should.be.equal(true) // check exist
    res[1].should.be.bignumber.equal(PROJECT_STATE_APP_SUBMITTED) // check state

    let pollId = await challengeApplication(PROJECT_LIST[0])
    await voteForChallenge(pollId, VOTER1, VOTE_FOR, 200)
    await voteForChallenge(pollId, VOTER2, AGAINST, 150)
    await increaseTime(Parameterizer.paramDefaults.commitStageLength)

    // Fast forward to reveal stage
    const revealStage = await plcrVoting.revealStageActive(pollId)
    revealStage.should.be.equal(true)

    await revealVote(pollId, VOTER1, VOTE_FOR, 200)
    await revealVote(pollId, VOTER2, AGAINST, 150)
    await increaseTime(Parameterizer.paramDefaults.revealStageLength)

    // Fast forward to end reveal stage
    const endStage = await plcrVoting.pollEnded(pollId)
    endStage.should.be.equal(true)

    const isPassed = await plcrVoting.isPassed(pollId)
    isPassed.should.be.equal(true)

    const canBeWhitelisted =
      await registry.canBeWhitelisted(PROJECT_LIST[0]).should.be.fulfilled
    canBeWhitelisted.should.be.equal(false)

    const challengeCanBeResolved =
      await registry.challengeCanBeResolved(PROJECT_LIST[0]).should.be.fulfilled
    challengeCanBeResolved.should.be.equal(true)

    // update status and check reward
    const { logs } = await registry.updateStatus(PROJECT_LIST[0]).should.be.fulfilled

    const ChallengeFailedEvent = logs.find(e => e.event === "_ChallengeFailed")
    should.exist(ChallengeFailedEvent)

    const NewProjectWhitelistedEvent = logs.find(e => e.event === "_NewProjectWhitelisted")
    should.exist(NewProjectWhitelistedEvent)

    //get and check project info
    res = await projectController.getProjectInfo(projectHash)

    res[0].should.be.equal(true) // check exist
    res[1].should.be.bignumber.equal(PROJECT_STATE_APP_ACCEPTED) // check state

    await voterReward(pollId, VOTER1, 200)
    await voterReward(pollId, VOTER2, 150)

    if (JumpId === ADD_MILESTONE) return

    /* ---------- Add milestone -------------*/
    await mockAddMilestone(projectHash)

    if (JumpId === TOKEN_SALE) return

    /* ---------- TokenSale part -------------*/
    await mockTokenSale(projectHash, TOKEN_SALE_RATE, projectToken)

    //get and check project info
    res = await projectController.getProjectInfo(projectHash)

    res[0].should.be.equal(true) // check exist
    res[1].should.be.bignumber.equal(PROJECT_STATE_TOKEN_SALE) // check state

    if (JumpId === MILESTONE_BEGIN) return
    /* ---------- Milestone Part (Rating and Refund)-------------*/
    let startTime = latestTime(web3)
    for (var i = 0; i < MILESTONE_OBJS.length; i++) {
      let milestoneId = i + 1
      // activate milestone
      if (JumpId === MILESTONE_ACTIVATE && MilestoneId === milestoneId) return
      await milestoneController.activate(
        projectHash,
        milestoneId,
        MILESTONE_WEI_LOCKED[i],
        startTime + TimeSetter.duration.days(1),
        startTime + TimeSetter.duration.days(3),
        {from: PROJECT_OWNER})

      if (JumpId === MILESTONE_REPUTATING && MilestoneId === milestoneId) return
      await reputationSystemRating(projectHash, milestoneId, startTime)

      if (JumpId === MILESTONE_REPUTATING && MilestoneId === milestoneId) return
      // increase time to last week and then test refund stage
      await refund(projectHash, milestoneId, startTime)

      // increase time to end of this milestone, ready to activate next milestone
      await fastForwardToEndOfMilestone(milestoneId, startTime)
      startTime += MILESTONE_LENGTH[i]
    }
  }

  if (JumpId > MILESTONE_BEGIN && MilestoneId === 0) {
    console.log("Milestone id start at 1")
    return
  }
  main()
}
