import {
  Kernel,
  Error,
  TimeSetter,
  Web3,
  saltHashVote,
  wweb3,
  should,
  VetXToken,
  RefundManager,
  ProjectController,
  MilestoneController,
  EtherCollector,
  PLCRVoting,
  Registry,
  Parameterizer,
  TokenSale} from "../constants.js"

const PROJECT_LIST = ["project0", "project1", "project2", "project3"]

const SALT = 12345
const VOTE_FOR = 1
const AGAINST = 0

const VOTE_NUMBER = 1000

const CHALLENGE_DEPOSIT = Parameterizer.paramDefaults.minDeposit / 2
const CHALLENGE_REWARD =
  CHALLENGE_DEPOSIT *
  Parameterizer.paramDefaults.dispensationPct /
  100

contract("Integration Test", function (accounts) {
  const ROOT = accounts[0]
  const PURCHASER = accounts[1]
  const PROJECT_OWNER = accounts[2]
  const CHALLENGER = accounts[3]
  const VOTER1 = accounts[4]
  const VOTER2 = accounts[5]

  let vetXToken
  let projectToken

  let registry
  let plcrVoting

  let projectController

  before(async function () {
    vetXToken = await VetXToken.Self.deployed()
    registry = await Registry.Self.deployed()
    plcrVoting = await PLCRVoting.Self.deployed()
    projectController = await ProjectController.Self.deployed()

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
  })

  let applyApplication = async function (projectName) {
    // Transfer minDeposit VTX to project owner
    vetXToken.transfer(PROJECT_OWNER, Parameterizer.paramDefaults.minDeposit)
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
    vetXToken.transfer(CHALLENGER, Parameterizer.paramDefaults.minDeposit)
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

      vetXToken.approve(plcrVoting.address, tokenNum, {from: voter})
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
    const afterCommit = TimeSetter.latestTime() + time + 1
    await TimeSetter.increaseTimeTo(afterCommit)
    await TimeSetter.advanceBlock()
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


  describe('The integration test for VTCR', function () {
    it('should be fulfilled', async function () {
      const voter1BalPre = await vetXToken.balanceOf(VOTER1)
      const voter2BalPre = await vetXToken.balanceOf(VOTER2)

      await applyApplication(PROJECT_LIST[0])
      let pollId = await challengeApplication(PROJECT_LIST[0])
      await voteForChallenge(pollId, VOTER1, VOTE_FOR, 100)
      await voteForChallenge(pollId, VOTER2, AGAINST, 150)
      await increaseTime(Parameterizer.paramDefaults.commitStageLength)

      // Fast forward to reveal stage
      const revealStage = await plcrVoting.revealStageActive(pollId)
      revealStage.should.be.equal(true)

      await revealVote(pollId, VOTER1, VOTE_FOR, 100)
      await revealVote(pollId, VOTER2, AGAINST, 150)
      await increaseTime(Parameterizer.paramDefaults.revealStageLength)

      // Fast forward to end reveal stage
      const endStage = await plcrVoting.pollEnded(pollId)
      endStage.should.be.equal(true)

      const isPassed = await plcrVoting.isPassed(pollId)
      isPassed.should.be.equal(false)

      // update status and check reward
      const challengerPre = await vetXToken.balanceOf(CHALLENGER)
      const projectOwnerPre = await vetXToken.balanceOf(PROJECT_OWNER)
      await registry.updateStatus(PROJECT_LIST[0]).should.be.fulfilled
      const challengerPost = await vetXToken.balanceOf(CHALLENGER)
      const projectOwnerPost = await vetXToken.balanceOf(PROJECT_OWNER)

      challengerPost.minus(challengerPre).should.be.bignumber.equal(
        CHALLENGE_REWARD + CHALLENGE_DEPOSIT)
      projectOwnerPost.minus(projectOwnerPre).should.be.bignumber.equal(0)

      await voterReward(pollId, VOTER1, 100)
      await voterReward(pollId, VOTER2, 150)

      const voter1BalPost = await vetXToken.balanceOf(VOTER1)
      const voter2BalPost = await vetXToken.balanceOf(VOTER2)
      voter1BalPost.minus(voter1BalPre).should.be.bignumber.equal(0)
      voter2BalPost.minus(voter2BalPre)
        .should.be.bignumber.equal(CHALLENGE_DEPOSIT - CHALLENGE_REWARD)
    })
  })
})
