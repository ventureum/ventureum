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
const Token = artifacts.require('mocks/Token');
const ACLHandler  = artifacts.require('handler/ACLHandler');
const ContractAddressHandler = artifacts.require('handler/ContractAddressHandler');
const Kernel = artifacts.require('kernel/Kernel');

const aclHandlerCI = Web3.utils.keccak256("ACLHandler");
const tokenSaleModuleCI = Web3.utils.keccak256("TokenSaleModule");
const tokenCollectorModuleCI = Web3.utils.keccak256("TokenCollectorModule");
const projectControllerCI = Web3.utils.keccak256("ProjectController");

const testNameSpace1 = Web3.utils.keccak256("testNameSpace1");
const testNameSpace2 = Web3.utils.keccak256("testNameSpace2");

const projectCI1 = Web3.utils.keccak256("projectCI1");

const contractAddressHandlerCI = Web3.utils.keccak256("ContractAddressHandler");
const rootCI = Web3.utils.keccak256("root");

const WITHDRAW_SIG = wweb3.eth.abi.encodeFunctionSignature("withdraw(address,address,uint256)");
const DEPOSIT_SIG = wweb3.eth.abi.encodeFunctionSignature("deposit(address,uint256)");

contract('TokenSaleModuleTest', function ([root, _, purchaser, testAccount1, testAccount2]) {

    before(async function () {
        this.totalSpendMoney = 1000000;
        this.depositValue = 10000;
        this.rate = 10;
    });

    beforeEach(async function () {
        this.kernel = await Kernel.new();
        this.token = await Token.new();
        this.aclHandler = await ACLHandler.new(this.kernel.address);
        this.contractAddressHandler = await ContractAddressHandler.new(this.kernel.address);

        this.projectController = await ProjectController.new(this.kernel.address);

        //deploy modules
        this.tokenCollectorModule = await TokenCollectorModule.new(this.kernel.address);
        this.tokenSaleModule = await TokenSaleModule.new(this.kernel.address);

        // register Handler
        this.kernel.registerHandler(aclHandlerCI, this.aclHandler.address);
        this.kernel.registerHandler(contractAddressHandlerCI, this.contractAddressHandler.address);

        // connect
        this.kernel.connect(this.aclHandler.address, []);
        this.kernel.connect(this.contractAddressHandler.address, []);
        this.kernel.connect(this.tokenSaleModule.address, [aclHandlerCI, contractAddressHandlerCI]) .should
            .be.fulfilled;
        this.kernel.connect(this.tokenCollectorModule.address, [aclHandlerCI, contractAddressHandlerCI]) .should
            .be.fulfilled;
        this.kernel.connect(this.projectController.address, [aclHandlerCI, contractAddressHandlerCI]) .should.be
            .fulfilled;

        // register contract
        this.contractAddressHandler.registerContract(tokenCollectorModuleCI, this.tokenCollectorModule.address)
            .should.be.fulfilled;
        this.contractAddressHandler.registerContract(rootCI, root).should.be.fulfilled;
        this.contractAddressHandler.registerContract(tokenSaleModuleCI, this.tokenSaleModule.address).should.be.fulfilled;

        // give permit for root address call registerOwner and setHandler
        this.aclHandler.permit(rootCI, tokenCollectorModuleCI, WITHDRAW_SIG).should.be.fulfilled;
        this.aclHandler.permit(rootCI, tokenCollectorModuleCI, DEPOSIT_SIG).should.be.fulfilled;
        this.aclHandler.permit(tokenSaleModuleCI, tokenCollectorModuleCI, WITHDRAW_SIG).should.be.fulfilled;

        // give tokenSaleModule permission to speed root's money
        this.token.approve(this.tokenCollectorModule.address, this.totalSpendMoney).should.be.fulfilled;

        //TODO(b232wang) register project

    });

    describe('basic test', function () {
        it('should connected', async function () {
            var result = await this.tokenSaleModule.isConnected.call();
            result.should.be.equal(true);
        });

        it('should register contract success', async function () {
            var result = await this.tokenSaleModule.CI.call();
            result.should.be.equal(tokenSaleModuleCI);
        });

        it('should receive correct handler', async function () {
            var result = await this.tokenSaleModule.handlers.call(aclHandlerCI);
            result.should.be.equal(this.aclHandler.address);
            result = await this.tokenSaleModule.handlers.call(contractAddressHandlerCI);
            result.should.be.equal(this.contractAddressHandler.address);
        });

        it('should receive correct kernel', async function () {
            var result = await this.tokenSaleModule.kernel.call();
            result.should.be.equal(this.kernel.address);
        });

        it('should receive status connected', async function () {
            var result = await this.tokenSaleModule.status.call();
            result.should.be.bignumber.equal(1);
        });

        it("should disconnect", async function () {
            await this.kernel.disconnect(this.tokenSaleModule.address, [aclHandlerCI, contractAddressHandlerCI])
                .should.be.fulfilled;
            var result = await this.tokenSaleModule.isConnected.call();
            result.should.be.equal(false);
        });

    });

    describe('basic functional test', function () {

        it('should start token sale', async function () {
            const { logs } = await this.tokenSaleModule.startTokenSale(projectCI1, this.rate, this.token.address)
                .should.be.fulfilled;
            const event = logs.find(e => e.event === "_StartTokenSale");
            should.exist(event);
            event.args.namespace.should.be.equal(projectCI1);
            event.args.rate.should.be.bignumber.equal(this.rate);
            event.args.token.should.be.equal(this.token.address);
        });

        it('should approve transfer for root', async function () {
            const { logs } = await this.token.approve(this.tokenCollectorModule.address, this.totalSpendMoney)
                .should.be.fulfilled;
            const event = logs.find(e => e.event === "Approval");
            should.exist(event);
            event.args.owner.should.be.equal(root);
            event.args.spender.should.be.equal(this.tokenCollectorModule.address);
            event.args.value.should.be.bignumber.equal(this.totalSpendMoney);
        });
    });

    describe('advanced testing include branch test', function () {
        beforeEach(async function () {
            this.ethAmount = 10;

            const val = await this.tokenCollectorModule.balanceOf.call(this.token.address);
            val.should.be.bignumber.equal(0);

            await this.tokenSaleModule.startTokenSale(projectCI1, this.rate, this.token.address)
                .should.be.fulfilled;
            await this.tokenCollectorModule.deposit(this.token.address, this.depositValue).should.be.fulfilled;
        });

        it('should buy token success', async function () {
            const tokenAmount = this.rate * this.ethAmount;

            const preStoreTokenBalance = await this.tokenCollectorModule.balanceOf.call(this.token.address);
            const prePurchaserTokenBalance = await this.token.balanceOf(purchaser);

            const { logs } = await this.tokenSaleModule.buyTokens(projectCI1, {value: this.ethAmount, from: purchaser})
                .should.be.fulfilled;

            const event = logs.find(e => e.event === "_BuyTokens");
            should.exist(event);
            event.args.namespace.should.be.equal(projectCI1);
            event.args.tokenNum.should.be.bignumber.equal(this.rate * this.ethAmount);
            event.args.ethNum.should.be.bignumber.equal(this.ethAmount);

            const postStoreTokenBalance = await this.tokenCollectorModule.balanceOf.call(this.token.address);
            const postPurchaserTokenBalance = await this.token.balanceOf(purchaser);

            postStoreTokenBalance.plus(tokenAmount).should.be.bignumber.equal(preStoreTokenBalance);
            postPurchaserTokenBalance.minus(tokenAmount).should.be.bignumber.equal(prePurchaserTokenBalance);
        });

        it('should finalize success', async function () {
            await this.tokenSaleModule.finalize(projectCI1).should.be.fulfilled;
            await this.tokenSaleModule.buyTokens(projectCI1, {value: this.ethAmount, from: purchaser})
                .should.be.rejectedWith(EVMRevert);
        });

        it('should receive avg price equal rate', async function () {
            await this.tokenSaleModule.avgPrice.call(projectCI1).should.be.rejectedWith(EVMRevert);
            await this.tokenSaleModule.buyTokens(projectCI1, {value: this.ethAmount, from: purchaser}).should.be.fulfilled;
            await this.tokenSaleModule.avgPrice.call(projectCI1).should.be.rejectedWith(EVMRevert);
            await this.tokenSaleModule.finalize(projectCI1).should.be.fulfilled;
            const afterFinalizedAvgPrice = await this.tokenSaleModule.avgPrice.call(projectCI1);

            const randomCI = rootCI;
            await this.tokenSaleModule.avgPrice.call(randomCI).should.rejectedWith(EVMRevert);

            afterFinalizedAvgPrice.should.be.bignumber.equal(this.rate);
        });

        it('should receive avg price equal zero', async function () {
            await this.tokenSaleModule.finalize(projectCI1).should.be.fulfilled;
            const afterFinalizedAvgPrice = await this.tokenSaleModule.avgPrice.call(projectCI1);
            afterFinalizedAvgPrice.should.be.bignumber.equal(0);
        });

        it('should rejected cause project already exist', async function () {
            await this.tokenSaleModule.startTokenSale(projectCI1, 123, this.token.address)
                .should.be.rejectedWith(EVMRevert);
        });

        it('should rejected cause project not exist', async function () {
            await this.tokenSaleModule.buyTokens(rootCI, {value: this.ethAmount, from: purchaser}).should.be
                .rejectedWith(EVMRevert);
        });

        it('should rejected cause project already finalized', async function () {
            await this.tokenSaleModule.finalize(projectCI1).should.be.fulfilled;
            await this.tokenSaleModule.buyTokens(projectCI1, {value: this.ethAmount, from: purchaser}).should.be
                .rejectedWith(EVMRevert);
        });

        it('should rejected cause buy too large token', async function () {
            await this.tokenCollectorModule.withdraw(this.token.address, root, this.depositValue);
            const preStoreTokenBalance = await this.tokenCollectorModule.balanceOf.call(this.token.address);
            preStoreTokenBalance.should.be.bignumber.equal(0);
            await this.tokenSaleModule.buyTokens(projectCI1, {value: this.ethAmount, from: purchaser}).should.be
                .rejectedWith(EVMRevert);
        });

        it('should rejected cause finalize a not exist project', async function () {
            await this.tokenSaleModule.finalize(rootCI).should.be.rejectedWith(EVMRevert);
        });

        it('should rejected cause finalize a finalized project', async function () {
            await this.tokenSaleModule.finalize(projectCI1).should.be.fulfilled;
            await this.tokenSaleModule.finalize(projectCI1).should.be.rejectedWith(EVMRevert);
        });
    });
});
