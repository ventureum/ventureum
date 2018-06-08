import ether from "openzeppelin-solidity/test/helpers/ether";
import { advanceBlock } from "openzeppelin-solidity/test/helpers/advanceToBlock";
import { increaseTimeTo, duration } from "openzeppelin-solidity/test/helpers/increaseTime";
import latestTime from "openzeppelin-solidity/test/helpers/latestTime";
import EVMRevert from "openzeppelin-solidity/test/helpers/EVMRevert"
import EVMThrow from "openzeppelin-solidity/test/helpers/EVMThrow"

const Web3 = require("web3")
const wweb3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
const BigNumber = web3.BigNumber;

const should = require("chai")
    .use(require("chai-as-promised"))
    .use(require("chai-bignumber")(BigNumber))
    .should();

const TokenSale = artifacts.require("modules/token_sale/TokenSale");
const TokenCollector = artifacts.require("modules/token_collector/TokenCollector");
const ProjectController = artifacts.require("modules/project_controller/ProjectController");
const ProjectControllerStorage =
    artifacts.require("modules/project_controller/ProjectControllerStorage");
const Token = artifacts.require("mocks/Token");
const ACLHandler  = artifacts.require("handler/ACLHandler");
const ContractAddressHandler = artifacts.require("handler/ContractAddressHandler");
const Kernel = artifacts.require("kernel/Kernel");
const RefundManager = artifacts.require("modules/managers/refund_manager/RefundManager");
const RefundManagerStorage =
    artifacts.require("modules/managers/refund_manager/RefundManagerStorage");
const MilestoneController = artifacts.require("modules/milestone_controller/MilestoneController");
const MilestoneCollectorStorage
    = artifacts.require("modules/milestone_controller/MilestoneControllerStorage");
const EtherCollector = artifacts.require("modules/ether_collector/EtherCollector");
const EtherCollectorStorage = artifacts.require("modules/ether_collector/EtherCollectorStorage");

// CIs
const ACL_HANDLER_CI = Web3.utils.keccak256("ACLHandler");
const CONTRACT_ADDRESS_HANDLER_CI = Web3.utils.keccak256("ContractAddressHandler");
const TOKEN_SALE_CI = Web3.utils.keccak256("TokenSale");
const TOKEN_COLLECTOR_CI = Web3.utils.keccak256("TokenCollector");
const PROJECT_CONTROLLER_CI = Web3.utils.keccak256("ProjectController");
const PROJECT_CONTROLLER_STORAGE_CI = Web3.utils.keccak256("ProjectControllerStorage");
const REFUND_MANAGER_CI = Web3.utils.keccak256("RefundManager");
const REFUND_MANAGER_STORAGE_CI = Web3.utils.keccak256("RefundManagerStorage");
const MILESTONE_CONTROLLER_CI = Web3.utils.keccak256("MilestoneController");
const MILESTONE_CONTROLLER_STORAGE_CI = Web3.utils.keccak256("MilestoneControllerStorage");
const ETHER_COLLECTOR_CI = Web3.utils.keccak256("EtherCollector");
const ETHER_COLLECTOR_STORAGE_CI = Web3.utils.keccak256("EtherCollectorStorage");

const ROOT_CI = Web3.utils.keccak256("root");
const FOUNDER_CI = Web3.utils.keccak256("founder");

const ETHER_DEPOSIT_SIG = wweb3.eth.abi.encodeFunctionSignature("deposit()");
const ETHER_WITHDRAW_SIG = wweb3.eth.abi.encodeFunctionSignature("withdraw(address,uint256)");
const WITHDRAW_SIG = wweb3.eth.abi.encodeFunctionSignature("withdraw(address,address,uint256)");
const DEPOSIT_SIG = wweb3.eth.abi.encodeFunctionSignature("deposit(address,uint256)");
const REGISTER_SIG =
    wweb3.eth.abi.encodeFunctionSignature("registerProject(bytes32,address,address)");
const SET_STORAGE_SIG = wweb3.eth.abi.encodeFunctionSignature("setStorage(address)");
const SET_UINT_SIG = wweb3.eth.abi.encodeFunctionSignature("setUint(bytes32,uint256)");
const GET_UINT_SIG = wweb3.eth.abi.encodeFunctionSignature("getUint(bytes32)");
const SET_ADDRESS_SIG = wweb3.eth.abi.encodeFunctionSignature("setAddress(bytes32,address)");
const GET_ADDRESS_SIG = wweb3.eth.abi.encodeFunctionSignature("getAddress(bytes32)");
const SET_BYTES32_SIG = wweb3.eth.abi.encodeFunctionSignature("setBytes32(bytes32,bytes32)");
const GET_BYTES32_SIG = wweb3.eth.abi.encodeFunctionSignature("getBytes32(bytes32)");
const SET_ARRAY_SIG = wweb3.eth.abi.encodeFunctionSignature("setArray(bytes32,bytes32[])");
const GET_ARRAY_SIG = wweb3.eth.abi.encodeFunctionSignature("getArray(bytes32)");


contract("RefundTest", function ([root, _, purchaser, founder]) {
    before(async function () {
        this.totalSpendMoney = 1000000;
        this.depositValue = 10000;
        this.rate = 10;
        this.ethAmount = 10;
        this.depositEthValue = 1000;

        this.oneMonth = duration.days(1) * 30;
        this.milestoneLength = duration.years(1);
        this.lastWeekLength = this.milestoneLength + 100 - duration.weeks(1);

        this.kernel = await Kernel.new();
        this.token = await Token.new();
        this.aclHandler = await ACLHandler.new(this.kernel.address);
        this.contractAddressHandler = await ContractAddressHandler.new(this.kernel.address);


        //deploy modules
        this.tokenCollector = await TokenCollector.new(this.kernel.address);
        this.tokenSale = await TokenSale.new(this.kernel.address);
        this.projectController = await ProjectController.new(this.kernel.address);
        this.projectControllerStorage = await ProjectControllerStorage.new(this.kernel.address);
        this.refundManager = await RefundManager.new(this.kernel.address);
        this.refundManagerStorage = await RefundManagerStorage.new(this.kernel.address);
        this.milestoneController = await MilestoneController.new(this.kernel.address);
        this.milestoneControllerStorage = await MilestoneCollectorStorage.new(this.kernel.address);
        this.etherCollector = await EtherCollector.new(this.kernel.address);
        this.etherCollectorStorage = await EtherCollectorStorage.new(this.kernel.address);

        // register Handler
        this.kernel.registerHandler(ACL_HANDLER_CI, this.aclHandler.address);
        this.kernel.registerHandler(
            CONTRACT_ADDRESS_HANDLER_CI ,
            this.contractAddressHandler.address);

        // connect
        this.kernel.connect(this.aclHandler.address, []);
        this.kernel.connect(this.contractAddressHandler.address, []);
        this.kernel.connect(
            this.tokenSale.address,
            [ACL_HANDLER_CI, CONTRACT_ADDRESS_HANDLER_CI]).should.be.fulfilled;
        this.kernel.connect(
            this.tokenCollector.address,
            [ACL_HANDLER_CI, CONTRACT_ADDRESS_HANDLER_CI]).should.be.fulfilled;
        this.kernel.connect(
            this.projectController.address,
            [ACL_HANDLER_CI, CONTRACT_ADDRESS_HANDLER_CI]).should.be.fulfilled;
        this.kernel.connect(
            this.projectControllerStorage.address,
            [ACL_HANDLER_CI, CONTRACT_ADDRESS_HANDLER_CI]).should.be.fulfilled;
        this.kernel.connect(
            this.refundManager.address,
            [ACL_HANDLER_CI, CONTRACT_ADDRESS_HANDLER_CI]).should.be.fulfilled;
        this.kernel.connect(
            this.refundManagerStorage.address,
            [ACL_HANDLER_CI, CONTRACT_ADDRESS_HANDLER_CI]).should.be.fulfilled;
        this.kernel.connect(
            this.milestoneController.address,
            [ACL_HANDLER_CI, CONTRACT_ADDRESS_HANDLER_CI]).should.be.fulfilled;
        this.kernel.connect(
            this.milestoneControllerStorage.address,
            [ACL_HANDLER_CI, CONTRACT_ADDRESS_HANDLER_CI]).should.be.fulfilled;
        this.kernel.connect(
            this.etherCollector.address,
            [ACL_HANDLER_CI, CONTRACT_ADDRESS_HANDLER_CI]).should.be.fulfilled;
        this.kernel.connect(
            this.etherCollectorStorage.address,
            [ACL_HANDLER_CI, CONTRACT_ADDRESS_HANDLER_CI]).should.be.fulfilled;

        // register root address
        this.contractAddressHandler.registerContract(ROOT_CI, root).should.be.fulfilled;
        // register token contracts
        this.contractAddressHandler.registerContract(
            TOKEN_COLLECTOR_CI,
            this.tokenCollector.address).should.be.fulfilled;
        this.contractAddressHandler.registerContract(
            TOKEN_SALE_CI,
            this.tokenSale.address).should.be.fulfilled;
        // register project
        this.contractAddressHandler.registerContract(
            PROJECT_CONTROLLER_CI,
            this.projectController.address).should.be.fulfilled;
        this.contractAddressHandler.registerContract(
            PROJECT_CONTROLLER_STORAGE_CI,
            this.projectControllerStorage.address).should.be.fulfilled;
        // refund manager and refund manager store
        this.contractAddressHandler.registerContract(
            REFUND_MANAGER_CI,
            this.refundManager.address).should.be.fulfilled;
        this.contractAddressHandler.registerContract(
            REFUND_MANAGER_STORAGE_CI,
            this.refundManagerStorage.address).should.be.fulfilled;
        // milestone and milestone storage
        this.contractAddressHandler.registerContract(
            MILESTONE_CONTROLLER_CI,
            this.milestoneController.address).should.be.fulfilled;
        this.contractAddressHandler.registerContract(
            MILESTONE_CONTROLLER_STORAGE_CI,
            this.milestoneControllerStorage.address).should.be.fulfilled;
        this.contractAddressHandler.registerContract(
            ETHER_COLLECTOR_CI,
            this.etherCollector.address).should.be.fulfilled;
        this.contractAddressHandler.registerContract(
            ETHER_COLLECTOR_STORAGE_CI,
            this.etherCollectorStorage.address).should.be.fulfilled;

        // give permit for root address call registerOwner and setHandler
        this.aclHandler.permit(ROOT_CI, TOKEN_COLLECTOR_CI, WITHDRAW_SIG)
            .should.be.fulfilled;
        this.aclHandler.permit(ROOT_CI, TOKEN_COLLECTOR_CI, DEPOSIT_SIG)
            .should.be.fulfilled;
        this.aclHandler.permit(TOKEN_SALE_CI, TOKEN_COLLECTOR_CI, WITHDRAW_SIG)
            .should.be.fulfilled;
        this.aclHandler.permit(ROOT_CI, PROJECT_CONTROLLER_CI, REGISTER_SIG)
            .should.be.fulfilled;
        this.aclHandler.permit(ROOT_CI, PROJECT_CONTROLLER_CI, SET_STORAGE_SIG)
            .should.be.fulfilled;
        this.aclHandler.permit(ROOT_CI, MILESTONE_CONTROLLER_CI, SET_STORAGE_SIG)
            .should.be.fulfilled;
        this.aclHandler.permit(ROOT_CI, REFUND_MANAGER_CI, SET_STORAGE_SIG)
            .should.be.fulfilled;
        this.aclHandler.permit(ROOT_CI, ETHER_COLLECTOR_CI, SET_STORAGE_SIG)
            .should.be.fulfilled;
        // give permit for refund manager to call storage
        this.aclHandler.permit(REFUND_MANAGER_CI, REFUND_MANAGER_STORAGE_CI, SET_UINT_SIG)
            .should.be.fulfilled;
        this.aclHandler.permit(REFUND_MANAGER_CI, REFUND_MANAGER_STORAGE_CI, GET_UINT_SIG)
            .should.be.fulfilled;
        this.aclHandler.permit(REFUND_MANAGER_CI, TOKEN_COLLECTOR_CI, DEPOSIT_SIG)
            .should.be.fulfilled;
        // give permit for milestone to call storage
        this.aclHandler.permit(
            MILESTONE_CONTROLLER_CI,
            MILESTONE_CONTROLLER_STORAGE_CI,
            SET_UINT_SIG).should.be.fulfilled;
        this.aclHandler.permit(
            MILESTONE_CONTROLLER_CI,
            MILESTONE_CONTROLLER_STORAGE_CI,
            GET_UINT_SIG).should.be.fulfilled;
        this.aclHandler.permit(
            MILESTONE_CONTROLLER_CI,
            MILESTONE_CONTROLLER_STORAGE_CI,
            SET_ADDRESS_SIG).should.be.fulfilled;
        this.aclHandler.permit(
            MILESTONE_CONTROLLER_CI,
            MILESTONE_CONTROLLER_STORAGE_CI,
            GET_ADDRESS_SIG).should.be.fulfilled;
        this.aclHandler.permit(
            MILESTONE_CONTROLLER_CI,
            MILESTONE_CONTROLLER_STORAGE_CI,
            SET_BYTES32_SIG).should.be.fulfilled;
        this.aclHandler.permit(
            MILESTONE_CONTROLLER_CI,
            MILESTONE_CONTROLLER_STORAGE_CI,
            GET_BYTES32_SIG).should.be.fulfilled;
        this.aclHandler.permit(
            MILESTONE_CONTROLLER_CI,
            MILESTONE_CONTROLLER_STORAGE_CI,
            SET_ARRAY_SIG).should.be.fulfilled;
        this.aclHandler.permit(
            MILESTONE_CONTROLLER_CI,
            MILESTONE_CONTROLLER_STORAGE_CI,
            GET_ARRAY_SIG).should.be.fulfilled;
        // give permit for refund manager to withdraw from ether collector
        this.aclHandler.permit(REFUND_MANAGER_CI, ETHER_COLLECTOR_CI, ETHER_WITHDRAW_SIG)
            .should.be.fulfilled;
        this.aclHandler.permit(ROOT_CI, ETHER_COLLECTOR_CI, ETHER_DEPOSIT_SIG)
            .should.be.fulfilled;
        // give permit for refund manager to withdraw from ether collector
        this.aclHandler.permit(ETHER_COLLECTOR_CI, ETHER_COLLECTOR_STORAGE_CI, SET_UINT_SIG)
            .should.be.fulfilled;
        this.aclHandler.permit(ETHER_COLLECTOR_CI, ETHER_COLLECTOR_STORAGE_CI, GET_UINT_SIG)
            .should.be.fulfilled;

        this.aclHandler.permit(
            PROJECT_CONTROLLER_CI,
            PROJECT_CONTROLLER_STORAGE_CI,
            SET_UINT_SIG).should.be.fulfilled;
        this.aclHandler.permit(
            PROJECT_CONTROLLER_CI,
            PROJECT_CONTROLLER_STORAGE_CI,
            SET_ADDRESS_SIG).should.be.fulfilled;
        this.aclHandler.permit(PROJECT_CONTROLLER_CI,
            PROJECT_CONTROLLER_STORAGE_CI,
            SET_BYTES32_SIG).should.be.fulfilled;

        // give tokenSale permission to spend root"s money
        this.token.approve(this.tokenCollector.address, this.totalSpendMoney)
            .should.be.fulfilled;
        this.token.approve(this.refundManager.address, this.totalSpendMoney)
            .should.be.fulfilled;

        this.projectController.setStorage(this.projectControllerStorage.address)
            .should.be.fulfilled;
        this.milestoneController.setStorage(this.milestoneControllerStorage.address)
            .should.be.fulfilled;
        this.refundManager.setStorage(this.refundManagerStorage.address).should.be.fulfilled;
        this.etherCollector.setStorage(this.etherCollectorStorage.address).should.be.fulfilled;

        this.contractAddressHandler.connect(
            this.refundManager.address,
            [
                PROJECT_CONTROLLER_CI,
                MILESTONE_CONTROLLER_CI,
                TOKEN_SALE_CI,
                TOKEN_COLLECTOR_CI,
                ETHER_COLLECTOR_CI
            ]).should.be.fulfilled;

        this.etherCollector.deposit({value: this.depositEthValue}).should.be.fulfilled;
    });

    describe("basic test", function () {
        it("should connected", async function () {
            let result = await this.tokenSale.isConnected.call();
            result.should.be.equal(true);
        });

        it("should register contract success", async function () {
            let result = await this.tokenSale.CI.call();
            result.should.be.equal(TOKEN_SALE_CI);
        });

        it("should receive correct handler", async function () {
            let result = await this.tokenSale.handlers.call(ACL_HANDLER_CI);
            result.should.be.equal(this.aclHandler.address);
            result = await this.tokenSale.handlers.call(CONTRACT_ADDRESS_HANDLER_CI);
            result.should.be.equal(this.contractAddressHandler.address);
        });

        it("should receive correct kernel", async function () {
            let result = await this.tokenSale.kernel.call();
            result.should.be.equal(this.kernel.address);
        });

        it("should receive status connected", async function () {
            let result = await this.tokenSale.status.call();
            result.should.be.bignumber.equal(1);
        });

    });

    describe("advance functional test", function () {
        it("should refund success", async function () {
            const ADVANCE_PROJECT_CI = Web3.utils.keccak256("advance1");
            const refundValue = 100;

            await this.projectController.registerProject(
                ADVANCE_PROJECT_CI,
                root,
                this.token.address).should.be.fulfilled;
            await this.milestoneController.addMilestone(
                ADVANCE_PROJECT_CI,
                this.milestoneLength,
                []).should.be.fulfilled;
            let currentTime = latestTime();
            await increaseTimeTo(currentTime + this.lastWeekLength);
            await this.milestoneController.startRefundStage(ADVANCE_PROJECT_CI, 0)
                .should.be.fulfilled;

            await this.tokenSale.startTokenSale(
                ADVANCE_PROJECT_CI,
                this.rate,
                this.token.address).should.be.fulfilled;

            let pre = await web3.eth.getBalance(purchaser);

            await this.tokenCollector.deposit(this.token.address, this.depositValue)
                .should.be.fulfilled;

            await this.tokenSale.buyTokens(
                ADVANCE_PROJECT_CI,
                {value: this.ethAmount, from: purchaser}).should.be.fulfilled;

            await this.tokenSale.finalize(ADVANCE_PROJECT_CI).should.be.fulfilled;

            const { logs } = await this.refundManager.refund(ADVANCE_PROJECT_CI, 0, refundValue)
                .should.be.fulfilled;
            const event = logs.find(e => e.event === "Refund");
            should.exist(event);
            event.args.sender.should.be.equal(root);
            event.args.namespace.should.be.equal(ADVANCE_PROJECT_CI);
            event.args.milestoneId.should.be.bignumber.equal(0);
            event.args.val.should.be.bignumber.equal(refundValue);
            event.args.ethNum.should.be.bignumber.equal(refundValue / this.rate);
            event.args.availableTime.should.be.bignumber.above(currentTime + this.oneMonth);
        });

        it("should withdraw success", async function () {
            const ADVANCE_PROJECT_CI = Web3.utils.keccak256("advance2");
            const refundValue = 100;

            await this.projectController.registerProject(
                ADVANCE_PROJECT_CI,
                root,
                this.token.address).should.be.fulfilled;
            await this.milestoneController.addMilestone(
                ADVANCE_PROJECT_CI,
                this.milestoneLength,
                []).should.be.fulfilled;
            let currentTime = latestTime();
            await increaseTimeTo(currentTime + this.lastWeekLength);
            await this.milestoneController.startRefundStage(ADVANCE_PROJECT_CI, 0)
                .should.be.fulfilled;

            await this.tokenSale.startTokenSale(
                ADVANCE_PROJECT_CI,
                this.rate,
                this.token.address).should.be.fulfilled;

            let pre = await web3.eth.getBalance(purchaser);

            await this.tokenCollector.deposit(this.token.address, this.depositValue)
                .should.be.fulfilled;

            await this.tokenSale.buyTokens(
                ADVANCE_PROJECT_CI,
                {value: this.ethAmount, from: purchaser}).should.be.fulfilled;

            await this.tokenSale.finalize(ADVANCE_PROJECT_CI).should.be.fulfilled;

            await this.refundManager.refund(ADVANCE_PROJECT_CI, 0, refundValue).should.be.fulfilled;

            //withdraw
            await this.refundManager.withdraw(ADVANCE_PROJECT_CI, 0)
                .should.be.rejectedWith(EVMRevert);
            await this.refundManager.withdraw(ROOT_CI, 0).should.be.rejectedWith(EVMRevert);
            await increaseTimeTo(latestTime() + this.oneMonth);

            const { logs } = await this.refundManager.withdraw(ADVANCE_PROJECT_CI, 0)
                .should.be.fulfilled;
            const event = logs.find(e => e.event === "Withdraw");
            should.exist(event);
            event.args.sender.should.be.equal(root);
            event.args.namespace.should.be.equal(ADVANCE_PROJECT_CI);
            event.args.milestoneId.should.be.bignumber.equal(0);
            event.args.balance.should.be.bignumber.equal(refundValue / this.rate);
        });
    });
});
