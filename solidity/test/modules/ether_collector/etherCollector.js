import EVMRevert from "openzeppelin-solidity/test/helpers/EVMRevert";

const Web3 = require("web3");
const wweb3 = new Web3();
const BigNumber = web3.BigNumber;
const should = require("chai")
    .use(require("chai-as-promised"))
    .use(require("chai-bignumber")(BigNumber))
    .should();

const Kernel = artifacts.require("kernel/Kernel");
const EtherCollector = artifacts.require(
    "modules/ether_collector/EtherCollector");
const EtherCollectorStorage = artifacts.require(
    "modules/ether_collector/EtherCollectorStorage");

const ACLHandler  = artifacts.require("handlers/ACLHandler");
const ContractAddressHandler = artifacts.require(
    "handlers/ContractAddressHandler");

// CIs
const ACL_HANDLER_CI = Web3.utils.keccak256("ACLHandler");
const CONTRACT_ADDRESS_HANDLER_CI = Web3.utils.keccak256(
    "ContractAddressHandler");
const BALANCE_CI = Web3.utils.keccak256("balance");
const ROOT_CI = Web3.utils.keccak256("root");

const ETHER_COLLECTOR_CI = Web3.utils.keccak256("EtherCollector");
const ETHER_COLLECTOR_STORAGE_CI = Web3.utils.keccak256(
    "EtherCollectorStorage");

//SIG
const SET_STORAGE_SIG = wweb3.eth.abi.encodeFunctionSignature(
    "setStorage(address)");
const DEPOSIT_SIG = wweb3.eth.abi.encodeFunctionSignature(
    "deposit()");
const SET_UINT_SIG = wweb3.eth.abi.encodeFunctionSignature(
    "setUint(bytes32,uint256)");
const GET_UINT_SIG = wweb3.eth.abi.encodeFunctionSignature(
    "getUint(bytes32)");
const WITHDRAW_SIG = wweb3.eth.abi.encodeFunctionSignature(
    "withdraw(address,uint256)");


contract("EtherCollectorTest", function ([root, _, testAccount1]) {
    before(async function () {
        this.value = 12345;

        this.kernel = await Kernel.new();
        this.aclHandler = await ACLHandler.new(this.kernel.address);
        this.contractAddressHandler = await ContractAddressHandler.new(
            this.kernel.address);

        this.kernel.registerHandler(ACL_HANDLER_CI, this.aclHandler.address);
        this.kernel.registerHandler(
            CONTRACT_ADDRESS_HANDLER_CI,
            this.contractAddressHandler.address);

        this.etherCollector = await EtherCollector.new(this.kernel.address);
        this.etherCollectorStorage = await EtherCollectorStorage.new(
            this.kernel.address);

        // kernel connect handers
        this.kernel.connect(this.aclHandler.address, []);
        this.kernel.connect(this.contractAddressHandler.address, []);

        this.kernel.connect(
            this.etherCollector.address,
            [ACL_HANDLER_CI, CONTRACT_ADDRESS_HANDLER_CI]).should.be.fulfilled;
        this.kernel.connect(
            this.etherCollectorStorage.address,
            [ACL_HANDLER_CI, CONTRACT_ADDRESS_HANDLER_CI]).should.be.fulfilled;

        // register contract
        this.contractAddressHandler.registerContract(ROOT_CI, root)
            .should.be.fulfilled;
        this.contractAddressHandler.registerContract(
            ETHER_COLLECTOR_CI,
            this.etherCollector.address).should.be.fulfilled;
        this.contractAddressHandler.registerContract(
            ETHER_COLLECTOR_STORAGE_CI,
            this.etherCollectorStorage.address).should.be.fulfilled;

        // give permit for root address call registerOwner and setHandler
        this.aclHandler.permit(ROOT_CI, ETHER_COLLECTOR_CI, SET_STORAGE_SIG)
            .should.be.fulfilled;
        this.aclHandler.permit(ROOT_CI, ETHER_COLLECTOR_CI, DEPOSIT_SIG)
            .should.be.fulfilled;
        this.aclHandler.permit(ROOT_CI, ETHER_COLLECTOR_CI, WITHDRAW_SIG)
            .should.be.fulfilled;

        this.aclHandler.permit(ROOT_CI, ETHER_COLLECTOR_STORAGE_CI, SET_UINT_SIG)
            .should.be.fulfilled;
        this.aclHandler.permit(ROOT_CI, ETHER_COLLECTOR_STORAGE_CI, GET_UINT_SIG)
            .should.be.fulfilled;
        this.aclHandler.permit(
            ETHER_COLLECTOR_CI,
            ETHER_COLLECTOR_STORAGE_CI,
            SET_UINT_SIG).should.be.fulfilled;

        this.etherCollector.setStorage(this.etherCollectorStorage.address)
            .should.be.fulfilled;
    });

    describe("EtherCollector basic test", function () {
        it("should connected", async function () {
            let result = await this.etherCollector.isConnected.call();
            result.should.be.equal(true);
        });

        it("should register contract success", async function () {
            let result = await this.etherCollector.CI.call();
            result.should.be.equal(ETHER_COLLECTOR_CI);
        });
    });

    describe("EtherCollectorStorage basic test", function () {
        it("should connected", async function () {
            let result = await this.etherCollectorStorage.isConnected.call();
            result.should.be.equal(true);
        });

        it("should register contract success", async function () {
            let result = await this.etherCollectorStorage.CI.call();
            result.should.be.equal(ETHER_COLLECTOR_STORAGE_CI);
        });

        it("should set/get uint correctly", async function () {
            let pre = await this.etherCollectorStorage.getUint.call(BALANCE_CI);
            await this.etherCollectorStorage.setUint(BALANCE_CI, this.value)
                .should.be.fulfilled;
            let post = await this.etherCollectorStorage.getUint.call(BALANCE_CI);
            post.minus(pre).should.be.bignumber.equal(this.value);
        })
    });

    describe("composite test", function () {
        it("should deposit success", async function () {
            let pre = await this.etherCollectorStorage.getUint.call(BALANCE_CI);
            await this.etherCollector.deposit({value: this.value})
                .should.be.fulfilled;

            let post = await this.etherCollectorStorage.getUint.call(BALANCE_CI);
            post.minus(pre).should.be.bignumber.equal(this.value);
        });

        it("should withdraw success", async function () {
            const withdrawAmount = 10000;

            await this.etherCollector.deposit({value: this.value})
                .should.be.fulfilled;

            let pre = await this.etherCollectorStorage.getUint.call(BALANCE_CI);
            await this.etherCollector.withdraw(testAccount1, withdrawAmount)
                .should.be.fulfilled;
            let post= await this.etherCollectorStorage.getUint.call(BALANCE_CI);

            pre.minus(post).should.be.bignumber.equal(withdrawAmount);
        });
    });

    describe("branch test", function () {
        it("should rejected withdraw", async function () {
            let currentBalance = await this.etherCollectorStorage.getUint.call(
                BALANCE_CI);
            await this.etherCollector.withdraw(testAccount1, 1 + currentBalance)
                .should.be.rejectedWith(EVMRevert);
        });
    });
});
