import EVMRevert from "openzeppelin-solidity/test/helpers/EVMRevert";

const Web3 = require("web3");
const wweb3 = new Web3();
const BigNumber = web3.BigNumber;

const should = require("chai")
    .use(require("chai-as-promised")) .use(require("chai-bignumber")(BigNumber))
    .should();

const TokenCollector = artifacts.require(
    "modules/token_collector/TokenCollector");
const Token = artifacts.require("mocks/Token");
const ACLHandler  = artifacts.require("handler/ACLHandler");
const ContractAddressHandler = artifacts.require(
    "handlers/ContractAddressHandler");
const Kernel = artifacts.require("kernel/Kernel");

const ACL_HANDLER_CI = Web3.utils.keccak256("ACLHandler");
const TOKEN_COLLECTOR_CI = Web3.utils.keccak256("TokenCollector");

const CONTRACT_ADDRESS_HANDLER_CI = Web3.utils.keccak256(
    "ContractAddressHandler");
const ROOT_CI = Web3.utils.keccak256("root");

const DEPOSIT_SIG = wweb3.eth.abi.encodeFunctionSignature(
    "deposit(address,uint256)");
const WITHDRAW_SIG = wweb3.eth.abi.encodeFunctionSignature(
    "withdraw(address,address,uint256)");

const NULL_ADDRESS = "0x0";


contract("TokenCollectorTest", function ([root, _, testAccount]) {
    before(async function () {
        this.totalSpendMoney = 1000000;
        this.value = 10000;

        this.kernel = await Kernel.new();
        this.token = await Token.new();
        this.aclHandler = await ACLHandler.new(this.kernel.address);
        this.contractAddressHandler = await ContractAddressHandler.new(
            this.kernel.address);
        this.tokenCollector = await TokenCollector.new(
            this.kernel.address);

        // register Handler
        this.kernel.registerHandler(ACL_HANDLER_CI, this.aclHandler.address);
        this.kernel.registerHandler(
            CONTRACT_ADDRESS_HANDLER_CI,
            this.contractAddressHandler.address);

        // connect
        this.kernel.connect(this.aclHandler.address, []);
        this.kernel.connect(this.contractAddressHandler.address, []);
        this.kernel.connect(
            this.tokenCollector.address,
            [ACL_HANDLER_CI, CONTRACT_ADDRESS_HANDLER_CI]).should.be.fulfilled;

        // register contract
        this.contractAddressHandler.registerContract(ROOT_CI, root)
            .should.be.fulfilled;

        // give permit for root address call registerOwner and setHandler
        this.aclHandler.permit(ROOT_CI, TOKEN_COLLECTOR_CI, WITHDRAW_SIG)
            .should.be.fulfilled;
        this.aclHandler.permit(ROOT_CI, TOKEN_COLLECTOR_CI, DEPOSIT_SIG)
            .should.be.fulfilled;

        // give tokenCollector permission to speed root"s money
        this.token.approve(
            this.tokenCollector.address,
            this.totalSpendMoney).should.be.fulfilled;

        // some basic test
        const val = await this.tokenCollector.balanceOf.call(
            this.token.address);
        val.should.be.bignumber.equal(0);
    });

    describe("basic test", function () {
        it("should connected", async function () {
            let result = await this.tokenCollector.isConnected.call();
            result.should.be.equal(true);
        });

        it("should register contract success", async function () {
            let result = await this.tokenCollector.CI.call();
            result.should.be.equal(TOKEN_COLLECTOR_CI);
        });

        it("should receive correct handler", async function () {
            let result = await this.tokenCollector.handlers.call(
                ACL_HANDLER_CI);
            result.should.be.equal(this.aclHandler.address);
            result = await this.tokenCollector.handlers.call(
                CONTRACT_ADDRESS_HANDLER_CI);
            result.should.be.equal(this.contractAddressHandler.address);
        });

        it("should receive correct kernel", async function () {
            let result = await this.tokenCollector.kernel.call();
            result.should.be.equal(this.kernel.address);
        });

        it("should receive status connected", async function () {
            let result = await this.tokenCollector.status.call();
            result.should.be.bignumber.equal(1);
        });
    });

    describe("branch test", function () {
        it("should rejected cause invalid token address", async function () {
            this.tokenCollector.balanceOf(NULL_ADDRESS)
                .should.be.rejectedWith(EVMRevert);
            this.tokenCollector.withdraw(NULL_ADDRESS, root, 0)
                .should.be.rejectedWith(EVMRevert);
            this.tokenCollector.withdraw(
                this.token.address,
                NULL_ADDRESS,
                0).should.be.rejectedWith(EVMRevert);
            this.tokenCollector.deposit(NULL_ADDRESS, 0)
                .should.be.rejectedWith(EVMRevert);
        });

        it("should rejected when withdraw value " +
          "over balance", async function () {
            let balance = await this.tokenCollector.balanceOf.call(
                this.token.address);
            this.tokenCollector.withdraw(
                this.token.address,
                root,
                balance + 1).should.be.rejectedWith(EVMRevert);
        });
    });

    describe("basic functional test", function () {
        it("should approve success", async function () {
            const { logs } = await this.token.approve(
                this.tokenCollector.address,
                this.totalSpendMoney).should.be.fulfilled;

            const event = logs.find(e => e.event === "Approval");
            should.exist(event);
            event.args.owner.should.be.equal(root);
            event.args.spender.should.be.equal(
                this.tokenCollector.address);
            event.args.value.should.be.bignumber.equal(this.totalSpendMoney);
        });

        it("should deposit success", async function () {
            const pre = await this.token.balanceOf.call(root);
            await this.tokenCollector.deposit(
                this.token.address, this.value).should.be.fulfilled;
            const post = await this.token.balanceOf.call(root);
            pre.minus(post).should.be.bignumber.equal(this.value);
        });

        it("should withdraw success", async function () {
            const withdrawAmount = 200;

            const pre = await this.token.balanceOf.call(testAccount);
            await this.tokenCollector.deposit(
                this.token.address, this.value).should.be.fulfilled;
            const storeBalance = await this.tokenCollector.balanceOf.call(
                this.token.address);

            await this.tokenCollector.withdraw(
                this.token.address,
                testAccount, withdrawAmount) .should.be.fulfilled;
            const post = await this.token.balanceOf.call(testAccount);
            post.minus(pre).should.be.bignumber.equal(withdrawAmount);

            const val = await this.tokenCollector.balanceOf.call(
                this.token.address);
            val.should.be.bignumber.equal(storeBalance - withdrawAmount);
        });
    });
});
