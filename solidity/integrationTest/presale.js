import {
  Presale,
  VetXToken,
  TimeSetter,
  TokenSale} from "../test/constants.js"

const LOCKUP_DURATION = TimeSetter.OneMonth

const INVESTOR_SPEND_WEI = 10000
const AGENT_SPEND_WEI = 20000
const CHEATER_SPEND_WEI = 40000

const INVESTOR_RATE = 200
const BENEFICIARY_RATE = 123
const CHEATER_RATE = 1200

contract("Presale Mock Test", function ([ROOT, INVESTOR, AGENT, BENEFICIARY, CHEATER]) {
  let vetXToken
  let presale

  before(async function () {
    vetXToken = await VetXToken.Self.deployed()
    presale = await Presale.Self.deployed()
  })

  describe('complete test process', async function () {
    it('should presale success', async function () {
      // Initial balance for vetxToken owner (which is ROOT)
      const INIT_BAL = await vetXToken.balanceOf(ROOT)

      // Transfer all VetXToken from Root to Presale contract (prepare for sale)
      await vetXToken.transfer(presale.address, INIT_BAL).should.be.fulfilled

      // pre token balance
      const preTokenBalInvestor = await vetXToken.balanceOf(INVESTOR)
      const preTokenBalAgent = await vetXToken.balanceOf(AGENT)
      const preTokenBalBeneficiary = await vetXToken.balanceOf(BENEFICIARY)
      const preTokenBalCheater = await vetXToken.balanceOf(CHEATER)

      // pre token balance for presale contracts
      const preTokenBalPresale = await vetXToken.balanceOf(presale.address)

      const startTime = TimeSetter.latestTime()

      // cheater can call purchaseTokens anytime
      await presale.purchaseTokens(
        CHEATER_RATE,
        {value: CHEATER_SPEND_WEI, from: CHEATER}).should.be.fulfilled
      // CHEATER buy token done.

      // Add beneficiary/self to whitelist
      await presale.addToWhitelist(INVESTOR, INVESTOR_RATE, LOCKUP_DURATION)
        .should.be.fulfilled
      await presale.addToWhitelist(BENEFICIARY, BENEFICIARY_RATE, LOCKUP_DURATION)
        .should.be.fulfilled

      // Fast forward to begin of presale
      TimeSetter.increaseTimeTo(startTime + TimeSetter.OneWeek)
      TimeSetter.advanceBlock()

      // Agent buy token for beneficiary
      await presale.buyTokens(
        BENEFICIARY,
        {value: AGENT_SPEND_WEI, from: AGENT}).should.be.fulfilled
      // Investor buy token for self
      await presale.purchaseToken({value: INVESTOR_SPEND_WEI, from: INVESTOR})
        .should.be.fulfilled

      // Fast forward to end of presale
      const endTime = startTime + 2 * TimeSetter.OneWeek

      // Fast forward to lockup duration end
      TimeSetter.increaseTimeTo(endTime + LOCKUP_DURATION)
      TimeSetter.advanceBlock()

      // Beneficiary withdraw tokens
      await presale.withdrawTokens({from: BENEFICIARY}).should.be.fulfilled
      await presale.withdrawTokens({from: INVESTOR}).should.be.fulfilled
      // INVESTOR and BENEFICIARY buy token done.

      // --------- checking stage -----------
      // post token balance
      const postTokenBalInvestor = await vetXToken.balanceOf(INVESTOR)
      const postTokenBalAgent = await vetXToken.balanceOf(AGENT)
      const postTokenBalBeneficiary = await vetXToken.balanceOf(BENEFICIARY)
      const postTokenBalCheater = await vetXToken.balanceOf(CHEATER)

      postTokenBalInvestor.minus(preTokenBalInvestor)
        .should.be.bignumber.equal(INVESTOR_RATE * INVESTOR_SPEND_WEI)
      postTokenBalAgent.minus(preTokenBalAgent)
        .should.be.bignumber.equal(0)
      postTokenBalBeneficiary.minus(preTokenBalBeneficiary)
        .should.be.bignumber.equal(BENEFICIARY_RATE * AGENT_SPEND_WEI)
      postTokenBalCheater.minus(preTokenBalCheater)
        .should.be.bignumber.equal(CHEATER_RATE * CHEATER_SPEND_WEI)

      // pre token balance for presale contracts
      const postTokenBalPresale = await vetXToken.balanceOf(presale.address)

      const totalTokenSale =
        INVESTOR_RATE * INVESTOR_SPEND_WEI +
        BENEFICIARY_RATE * AGENT_SPEND_WEI +
        CHEATER_RATE * CHEATER_SPEND_WEI
      preTokenBalPresale.minus(postTokenBalPresale)
        .should.be.bignumber.equal(totalTokenSale)
    })
  })
})
