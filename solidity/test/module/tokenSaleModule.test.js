import EVMRevert from 'openzeppelin-solidity/test/helpers/EVMRevert'
import EVMThrow from 'openzeppelin-solidity/test/helpers/EVMThrow'

const Web3 = require('web3')
const wweb3 = new Web3();
const BigNumber = web3.BigNumber;

const should = require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .should();

const TokenSaleModule = artifacts.require('modules/TokenSaleModule');
const TokenCollectorModule = artifacts.require('modules/TokenCollectorModule');
const ProjectController = artifacts.require('project_controller/ProjectController');
const ProjectControllerStorage = artifacts.require('project_controller/ProjectControllerStorage');
const Token = artifacts.require('mocks/Token');
const ACLHandler  = artifacts.require('handler/ACLHandler');
const ContractAddressHandler = artifacts.require('handler/ContractAddressHandler');
const Kernel = artifacts.require('kernel/Kernel');

// CIs
const ACL_HANDLER_CI = Web3.utils.keccak256("ACLHandler");
const CONTRACT_ADDRESS_HANDLER_CI = Web3.utils.keccak256("ContractAddressHandler");
const TOKEN_SALE_MODULE_CI = Web3.utils.keccak256("TokenSaleModule");
const TOKEN_COLLECTOR_MODULE_CI = Web3.utils.keccak256("TokenCollectorModule");
const PROJECT_CONTROLLER_CI = Web3.utils.keccak256("ProjectController");
const PROJECT_CONTROLLER_STORAGE_CI = Web3.utils.keccak256("ProjectControllerStorage");

const PROJECT_CI1 = Web3.utils.keccak256("PROJECT_CI1");
const PROJECT_CI2 = Web3.utils.keccak256("PROJECT_CI2");

const ROOT_CI = Web3.utils.keccak256("root");
const FOUNDER_CI = Web3.utils.keccak256("founder");

const WITHDRAW_SIG = wweb3.eth.abi.encodeFunctionSignature("withdraw(address,address,uint256)");
const DEPOSIT_SIG = wweb3.eth.abi.encodeFunctionSignature("deposit(address,uint256)");
const REGISTER_SIG =
    wweb3.eth.abi.encodeFunctionSignature("registerProject(bytes32,address,address)");
const SET_STORAGE_SIG = wweb3.eth.abi.encodeFunctionSignature("setStorage(address)");
const SET_UINT_SIG = wweb3.eth.abi.encodeFunctionSignature("setUint(bytes32,uint256)");
const SET_ADDRESS_SIG = wweb3.eth.abi.encodeFunctionSignature("setAddress(bytes32,address)");
const SET_BYTES32_SIG = wweb3.eth.abi.encodeFunctionSignature("setBytes32(bytes32,bytes32)");


contract('TokenSaleModuleTest', function ([root, _, purchaser, founder]) {
    before(async function () {
        this.totalSpendMoney = 1000000;
        this.depositValue = 10000;
        this.rate = 10;

        this.kernel = await Kernel.new();
        this.token = await Token.new();
        this.aclHandler = await ACLHandler.new(this.kernel.address);
        this.contractAddressHandler = await ContractAddressHandler.new(this.kernel.address);


        //deploy modules
        this.tokenCollectorModule = await TokenCollectorModule.new(this.kernel.address);
        this.tokenSaleModule = await TokenSaleModule.new(this.kernel.address);
        this.projectController = await ProjectController.new(this.kernel.address);
        this.projectControllerStorage = await ProjectControllerStorage.new(this.kernel.address);

        // register Handler
        this.kernel.registerHandler(ACL_HANDLER_CI, this.aclHandler.address);
        this.kernel.registerHandler(
            CONTRACT_ADDRESS_HANDLER_CI ,
            this.contractAddressHandler.address);

        // connect
        this.kernel.connect(this.aclHandler.address, []);
        this.kernel.connect(this.contractAddressHandler.address, []);
        this.kernel.connect(
            this.tokenSaleModule.address,
            [ACL_HANDLER_CI, CONTRACT_ADDRESS_HANDLER_CI]).should.be.fulfilled;
        this.kernel.connect(
            this.tokenCollectorModule.address,
            [ACL_HANDLER_CI, CONTRACT_ADDRESS_HANDLER_CI]).should.be.fulfilled;
        this.kernel.connect(
            this.projectController.address,
            [ACL_HANDLER_CI, CONTRACT_ADDRESS_HANDLER_CI]).should.be.fulfilled;
        this.kernel.connect(
            this.projectControllerStorage.address,
            [ACL_HANDLER_CI, CONTRACT_ADDRESS_HANDLER_CI]).should.be.fulfilled;

        // register contract
        this.contractAddressHandler.registerContract(
            TOKEN_COLLECTOR_MODULE_CI,
            this.tokenCollectorModule.address).should.be.fulfilled;
        this.contractAddressHandler.registerContract(ROOT_CI, root).should.be.fulfilled;
        this.contractAddressHandler.registerContract(
            TOKEN_SALE_MODULE_CI,
            this.tokenSaleModule.address).should.be.fulfilled;
        this.contractAddressHandler.registerContract(
            PROJECT_CONTROLLER_CI,
            this.projectController.address).should.be.fulfilled;
        this.contractAddressHandler.registerContract(
            PROJECT_CONTROLLER_STORAGE_CI,
            this.projectControllerStorage.address).should.be.fulfilled;

        // give permit for root address call registerOwner and setHandler
        this.aclHandler.permit(ROOT_CI, TOKEN_COLLECTOR_MODULE_CI, WITHDRAW_SIG)
            .should.be.fulfilled;
        this.aclHandler.permit(ROOT_CI, TOKEN_COLLECTOR_MODULE_CI, DEPOSIT_SIG)
            .should.be.fulfilled;
        this.aclHandler.permit(TOKEN_SALE_MODULE_CI, TOKEN_COLLECTOR_MODULE_CI, WITHDRAW_SIG)
            .should.be.fulfilled;
        this.aclHandler.permit(ROOT_CI, PROJECT_CONTROLLER_CI, REGISTER_SIG)
            .should.be.fulfilled;
        this.aclHandler.permit(ROOT_CI, PROJECT_CONTROLLER_CI, SET_STORAGE_SIG)
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

        // give tokenSaleModule permission to speed root's money
        this.token.approve(this.tokenCollectorModule.address, this.totalSpendMoney)
            .should.be.fulfilled;

        this.projectController.setStorage(this.projectControllerStorage.address)
            .should.be.fulfilled;
    });

    describe('basic test', function () {
        it('should connected', async function () {
            let result = await this.tokenSaleModule.isConnected.call();
            result.should.be.equal(true);
        });

        it('should register contract success', async function () {
            let result = await this.tokenSaleModule.CI.call();
            result.should.be.equal(TOKEN_SALE_MODULE_CI);
        });

        it('should receive correct handler', async function () {
            let result = await this.tokenSaleModule.handlers.call(ACL_HANDLER_CI);
            result.should.be.equal(this.aclHandler.address);
            result = await this.tokenSaleModule.handlers.call(CONTRACT_ADDRESS_HANDLER_CI);
            result.should.be.equal(this.contractAddressHandler.address);
        });

        it('should receive correct kernel', async function () {
            let result = await this.tokenSaleModule.kernel.call();
            result.should.be.equal(this.kernel.address);
        });

        it('should receive status connected', async function () {
            let result = await this.tokenSaleModule.status.call();
            result.should.be.bignumber.equal(1);
        });
    });

    describe('basic functional test', function () {
        it('should start token sale', async function () {
            this.projectController.registerProject(PROJECT_CI1, root, this.token.address)
                .should.be.fulfilled;

            const { logs } = await this.tokenSaleModule.startTokenSale(
                PROJECT_CI1,
                this.rate,
                this.token.address).should.be.fulfilled;
            const event = logs.find(e => e.event === "_StartTokenSale");
            should.exist(event);
            event.args.namespace.should.be.equal(PROJECT_CI1);
            event.args.rate.should.be.bignumber.equal(this.rate);
            event.args.token.should.be.equal(this.token.address);
        });

        it('should approve transfer for root', async function () {
            const { logs } = await this.token.approve(
                this.tokenCollectorModule.address,
                this.totalSpendMoney).should.be.fulfilled;
            const event = logs.find(e => e.event === "Approval");
            should.exist(event);
            event.args.owner.should.be.equal(root);
            event.args.spender.should.be.equal(this.tokenCollectorModule.address);
            event.args.value.should.be.bignumber.equal(this.totalSpendMoney);
        });

        it('should finalize success', async function () {
            const testCI1 = Web3.utils.keccak256("testCI1");
            this.projectController.registerProject(testCI1, root, this.token.address)
                .should.be.fulfilled;

            await this.tokenSaleModule.startTokenSale(testCI1, this.rate, this.token.address)
                .should.be.fulfilled;
            await this.tokenSaleModule.finalize(testCI1).should.be.fulfilled;
            await this.tokenSaleModule.buyTokens(testCI1, {value: this.ethAmount, from: purchaser})
                .should.be.rejectedWith(EVMRevert);
        });

        it('should rejected cause project already finalized', async function () {
            const testCI2 = Web3.utils.keccak256("testCI2");
            this.projectController.registerProject(testCI2, root, this.token.address)
                .should.be.fulfilled;

            await this.tokenSaleModule.startTokenSale(testCI2, this.rate, this.token.address)
                .should.be.fulfilled;
            await this.tokenSaleModule.finalize(testCI2).should.be.fulfilled;
            await this.tokenSaleModule.buyTokens(testCI2, {value: this.ethAmount, from: purchaser})
                .should.be.rejectedWith(EVMRevert);
        });

        it('should rejected cause finalize a finalized project', async function () {
            const testCI3 = Web3.utils.keccak256("testCI3");
            this.projectController.registerProject(testCI3, root, this.token.address)
                .should.be.fulfilled;

            await this.tokenSaleModule.startTokenSale(testCI3, this.rate, this.token.address)
                .should.be.fulfilled;
            await this.tokenSaleModule.finalize(testCI3).should.be.fulfilled;
            await this.tokenSaleModule.finalize(testCI3).should.be.rejectedWith(EVMRevert);
        });
    });

    describe('advanced testing include branch test', function () {
        before(async function () {
            this.ethAmount = 10;
            await this.tokenCollectorModule.deposit(this.token.address, this.depositValue)
                .should.be.fulfilled;
        })

        it('should buy token success', async function () {
            const PROJECT_CI = Web3.utils.keccak256("advanced1");
            this.projectController.registerProject(PROJECT_CI, root, this.token.address)
                .should.be.fulfilled;

            await this.tokenSaleModule.startTokenSale(PROJECT_CI, this.rate, this.token.address)
                .should.be.fulfilled;

            const tokenAmount = this.rate * this.ethAmount;

            const preStoreTokenBalance =
                await this.tokenCollectorModule.balanceOf.call(this.token.address);
            const prePurchaserTokenBalance = await this.token.balanceOf(purchaser);

            const { logs } = await this.tokenSaleModule.buyTokens(
                PROJECT_CI,
                {value: this.ethAmount, from: purchaser}).should.be.fulfilled;

            const event = logs.find(e => e.event === "_BuyTokens");
            should.exist(event);
            event.args.namespace.should.be.equal(PROJECT_CI);
            event.args.tokenNum.should.be.bignumber.equal(this.rate * this.ethAmount);
            event.args.ethNum.should.be.bignumber.equal(this.ethAmount);

            const postStoreTokenBalance =
                await this.tokenCollectorModule.balanceOf.call(this.token.address);
            const postPurchaserTokenBalance = await this.token.balanceOf(purchaser);

            postStoreTokenBalance.plus(tokenAmount).should.be.bignumber.equal(preStoreTokenBalance);
            postPurchaserTokenBalance.minus(tokenAmount)
                .should.be.bignumber.equal(prePurchaserTokenBalance);
        });

        it('should receive avg price equal rate', async function () {
            const PROJECT_CI = Web3.utils.keccak256("advanced2");
            this.projectController.registerProject(PROJECT_CI, root, this.token.address)
                .should.be.fulfilled;

            await this.tokenSaleModule.startTokenSale(PROJECT_CI, this.rate, this.token.address)
                .should.be.fulfilled;

            await this.tokenSaleModule.avgPrice.call(PROJECT_CI).should.be.rejectedWith(EVMRevert);
            await this.tokenSaleModule.buyTokens(
                PROJECT_CI,
                {value: this.ethAmount, from: purchaser}).should.be.fulfilled;
            await this.tokenSaleModule.avgPrice.call(PROJECT_CI).should.be.rejectedWith(EVMRevert);
            await this.tokenSaleModule.finalize(PROJECT_CI).should.be.fulfilled;
            const afterFinalizedAvgPrice = await this.tokenSaleModule.avgPrice.call(PROJECT_CI);

            const randomCI = ROOT_CI;
            await this.tokenSaleModule.avgPrice.call(randomCI).should.rejectedWith(EVMRevert);

            afterFinalizedAvgPrice.should.be.bignumber.equal(this.rate);
        });

        it('should receive avg price equal zero', async function () {
            const PROJECT_CI = Web3.utils.keccak256("advanced3");
            this.projectController.registerProject(PROJECT_CI, root, this.token.address)
                .should.be.fulfilled;

            await this.tokenSaleModule.startTokenSale(PROJECT_CI, this.rate, this.token.address)
                .should.be.fulfilled;

            await this.tokenSaleModule.finalize(PROJECT_CI).should.be.fulfilled;
            const afterFinalizedAvgPrice = await this.tokenSaleModule.avgPrice.call(PROJECT_CI);
            afterFinalizedAvgPrice.should.be.bignumber.equal(0);
        });

        it('should rejected cause project already exist', async function () {
            const PROJECT_CI = Web3.utils.keccak256("advanced4");
            this.projectController.registerProject(PROJECT_CI, root, this.token.address)
                .should.be.fulfilled;

            await this.tokenSaleModule.startTokenSale(PROJECT_CI, this.rate, this.token.address)
                .should.be.fulfilled;

            await this.tokenSaleModule.startTokenSale(PROJECT_CI, 123, this.token.address)
                .should.be.rejectedWith(EVMRevert);
        });

        it('should rejected cause project not exist', async function () {
            const PROJECT_CI = Web3.utils.keccak256("advanced5");
            this.projectController.registerProject(PROJECT_CI, root, this.token.address)
                .should.be.fulfilled;

            await this.tokenSaleModule.startTokenSale(PROJECT_CI, this.rate, this.token.address)
                .should.be.fulfilled;

            await this.tokenSaleModule.buyTokens(ROOT_CI, {value: this.ethAmount, from: purchaser})
                .should.be.rejectedWith(EVMRevert);
        });


        it('should rejected cause buy too large token', async function () {
            const PROJECT_CI = Web3.utils.keccak256("advanced6");
            this.projectController.registerProject(PROJECT_CI, root, this.token.address)
                .should.be.fulfilled;

            await this.tokenSaleModule.startTokenSale(PROJECT_CI, this.rate, this.token.address)
                .should.be.fulfilled;
            const storeBalance = await this.tokenCollectorModule.balanceOf.call(
                this.token.address);

            await this.tokenCollectorModule.withdraw(this.token.address, root, storeBalance);
            const preStoreTokenBalance = await this.tokenCollectorModule.balanceOf.call(
                this.token.address);
            preStoreTokenBalance.should.be.bignumber.equal(0);
            await this.tokenSaleModule.buyTokens(
                PROJECT_CI,
                {value: this.ethAmount, from: purchaser}).should.be.rejectedWith(EVMRevert);
        });

        it('should rejected cause finalize a not exist project', async function () {
            const PROJECT_CI = Web3.utils.keccak256("advanced7");
            this.projectController.registerProject(PROJECT_CI, root, this.token.address)
                .should.be.fulfilled;

            await this.tokenSaleModule.startTokenSale(PROJECT_CI, this.rate, this.token.address)
                .should.be.fulfilled;

            await this.tokenSaleModule.finalize(ROOT_CI).should.be.rejectedWith(EVMRevert);
        });
    });
});
