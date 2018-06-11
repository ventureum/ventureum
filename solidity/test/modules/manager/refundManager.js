import {should, Web3, TimeSetter, Error, Kernel} from "../../contants.js";
const shared = require("../../shared.js");

const TOTAL_SPEND_MONEY = 1000000;
const DEPOSIT_VALUE = 10000;
const RATE = 10;
const ETH_AMOUNT = 10;
const DEPOSIT_ETH_VALUE = 1000;
const MILESTONE_LENGTH = TimeSetter.OneYear;
const LAST_WEEK_LENGTH = MILESTONE_LENGTH + 100 - TimeSetter.OneWeek;


contract("RefundManagerTest", function (accounts) {
  const ROOT = accounts[0];
  const PURCHASER = accounts[2];

  let token;
  let kernel;
  let refundManager;
  let projectController;
  let milestoneController;
  let etherCollector;
  let tokenCollector;
  let tokenSale;

  before(async function () {
    let context = await shared.run(accounts);
    token = context.token;
    kernel = context.kernel;
    refundManager = context.refundManager;
    projectController = context.projectController;
    milestoneController = context.milestoneController;
    etherCollector = context.etherCollector;
    tokenCollector = context.tokenCollector;
    tokenSale = context.tokenSale;


    // give tokenSale permission to spend ROOT's money
    await token.approve(tokenCollector.address, TOTAL_SPEND_MONEY);
    await token.approve(refundManager.address, TOTAL_SPEND_MONEY);
    await etherCollector.deposit({value: DEPOSIT_ETH_VALUE});
  });

  describe("advance functional test", function () {
    it("should refund success", async function () {
      const ADVANCE_PROJECT_CI = Web3.utils.keccak256("advance1");
      const refundValue = 100;

      await projectController.registerProject(
        ADVANCE_PROJECT_CI,
        ROOT,
        token.address).should.be.fulfilled;
      await milestoneController.addMilestone(
        ADVANCE_PROJECT_CI,
        MILESTONE_LENGTH,
        []).should.be.fulfilled;

      let currentTime = TimeSetter.latestTime();
      await TimeSetter.increaseTimeTo(currentTime + LAST_WEEK_LENGTH);
      await milestoneController.startRefundStage(ADVANCE_PROJECT_CI, 0)
        .should.be.fulfilled;

      await tokenSale.startTokenSale(
        ADVANCE_PROJECT_CI,
        RATE,
        token.address).should.be.fulfilled;

      await tokenCollector.deposit(token.address, DEPOSIT_VALUE)
        .should.be.fulfilled;

      await tokenSale.buyTokens(
        ADVANCE_PROJECT_CI,
        {value: ETH_AMOUNT, from: PURCHASER}).should.be.fulfilled;

      await tokenSale.finalize(ADVANCE_PROJECT_CI).should.be.fulfilled;

      const { logs } = await refundManager.refund(
        ADVANCE_PROJECT_CI, 0, refundValue).should.be.fulfilled;
      const event = logs.find(e => e.event === "Refund");
      should.exist(event);
      event.args.sender.should.be.equal(ROOT);
      event.args.namespace.should.be.equal(ADVANCE_PROJECT_CI);
      event.args.milestoneId.should.be.bignumber.equal(0);
      event.args.val.should.be.bignumber.equal(refundValue);
      event.args.ethNum.should.be.bignumber.equal(refundValue / RATE);
      event.args.availableTime.
        should.be.bignumber.above(currentTime + TimeSetter.OneMonth);
    });

    it("should withdraw success", async function () {
      const ADVANCE_PROJECT_CI = Web3.utils.keccak256("advance2");
      const refundValue = 100;

      await projectController.registerProject(
        ADVANCE_PROJECT_CI,
        ROOT,
        token.address).should.be.fulfilled;
      await milestoneController.addMilestone(
        ADVANCE_PROJECT_CI,
        MILESTONE_LENGTH,
        []).should.be.fulfilled;
      let currentTime = TimeSetter.latestTime();
      await TimeSetter.increaseTimeTo(currentTime + LAST_WEEK_LENGTH);
      await milestoneController.startRefundStage(ADVANCE_PROJECT_CI, 0)
        .should.be.fulfilled;

      await tokenSale.startTokenSale(
        ADVANCE_PROJECT_CI,
        RATE,
        token.address).should.be.fulfilled;

      await tokenCollector.deposit(token.address, DEPOSIT_VALUE)
        .should.be.fulfilled;

      await tokenSale.buyTokens(
        ADVANCE_PROJECT_CI,
        {value: ETH_AMOUNT, from: PURCHASER}).should.be.fulfilled;

      await tokenSale.finalize(ADVANCE_PROJECT_CI).should.be.fulfilled;

      await refundManager.refund(ADVANCE_PROJECT_CI, 0, refundValue)
        .should.be.fulfilled;

      //withdraw
      await refundManager.withdraw(ADVANCE_PROJECT_CI, 0)
      .should.be.rejectedWith(Error.EVMRevert);
      await refundManager.withdraw(Kernel.RootCI, 0)
      .should.be.rejectedWith(Error.EVMRevert);
      await TimeSetter.increaseTimeTo(
        TimeSetter.latestTime() + TimeSetter.OneMonth);

      const { logs } = await refundManager.withdraw(ADVANCE_PROJECT_CI, 0)
        .should.be.fulfilled;
      const event = logs.find(e => e.event === "Withdraw");
      should.exist(event);
      event.args.sender.should.be.equal(ROOT);
      event.args.namespace.should.be.equal(ADVANCE_PROJECT_CI);
      event.args.milestoneId.should.be.bignumber.equal(0);
      event.args.balance.should.be.bignumber.equal(refundValue / RATE);
    });
  });
});
