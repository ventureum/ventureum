import { should, Web3, Error, EtherCollector } from '../../contants'
const shared = require("../../shared.js");

const BALANCE_CI = Web3.utils.keccak256("balance");
const VALUE = 12345;


contract("EtherCollectorTest", function (accounts) {
  const TEST_ACCOUNT1 = accounts[2];

  let etherCollector;
  let etherCollectorStorage;

  before(async function () {
    let context = await shared.run(accounts);
    etherCollector = context.etherCollector;
    etherCollectorStorage = context.etherCollectorStorage;
  });

  describe("EtherCollector basic test", function () {
    it("should connected", async function () {
      let result = await etherCollector.isConnected.call();
      result.should.be.equal(true);
    });

    it("should register contract success", async function () {
      let result = await etherCollector.CI.call();
      result.should.be.equal(EtherCollector.CI);
    });
  });

  describe("EtherCollectorStorage basic test", function () {
    it("should connected", async function () {
      let result = await etherCollectorStorage.isConnected.call();
      result.should.be.equal(true);
    });

    it("should register contract success", async function () {
      let result = await etherCollectorStorage.CI.call();
      result.should.be.equal(EtherCollector.Storage.CI);
    });

    it("should set/get uint correctly", async function () {
      let pre = await etherCollectorStorage.getUint.call(BALANCE_CI);
      await etherCollectorStorage.setUint(BALANCE_CI, VALUE)
        .should.be.fulfilled;
      let post = await etherCollectorStorage.getUint.call(BALANCE_CI);
      post.minus(pre).should.be.bignumber.equal(VALUE);
    })
  });

  describe("composite test", function () {
    it("should deposit success", async function () {
      let pre = await etherCollectorStorage.getUint.call(BALANCE_CI);
      await etherCollector.deposit({value: VALUE})
        .should.be.fulfilled;

      let post = await etherCollectorStorage.getUint.call(BALANCE_CI);
      post.minus(pre).should.be.bignumber.equal(VALUE);
    });

    it("should withdraw success", async function () {
      const withdrawAmount = 10000;

      await etherCollector.deposit({value: VALUE})
        .should.be.fulfilled;

      let pre = await etherCollectorStorage.getUint.call(BALANCE_CI);
      await etherCollector.withdraw(TEST_ACCOUNT1, withdrawAmount)
        .should.be.fulfilled;
      let post= await etherCollectorStorage.getUint.call(BALANCE_CI);

      pre.minus(post).should.be.bignumber.equal(withdrawAmount);
    });
  });

  describe("branch test", function () {
    it("should rejected withdraw", async function () {
      let currentBalance = await etherCollectorStorage.getUint.call(
        BALANCE_CI);
      await etherCollector.withdraw(TEST_ACCOUNT1, 1 + currentBalance)
      .should.be.rejectedWith(Error.EVMRevert);
    });
  });
});
