import EVMRevert from 'openzeppelin-solidity/test/helpers/EVMRevert'
import EVMThrow from 'openzeppelin-solidity/test/helpers/EVMThrow'

const wweb3 = require('web3')
const BigNumber = web3.BigNumber;

const should = require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .should();

const TokenCollectorModule = artifacts.require('modules/TokenCollectorModule');
const Token = artifacts.require('mocks/Token');
const ACLHandler  = artifacts.require('handler/ACLHandler');
const ContractAddressHandler = artifacts.require('handler/ContractAddressHandler');
const Kernel = artifacts.require('kernel/Kernel');

contract('TokenCollectorModuleTest', function ([root, _, testAccount1, testAccount2]) {
    const aclHandlerCI = wweb3.utils.keccak256("ACLHandler");
    const tokenCollectorModuleCI = wweb3.utils.keccak256("TokenCollectorModule");

    const testNameSpace1 = wweb3.utils.keccak256("testNameSpace1");
    const testNameSpace2 = wweb3.utils.keccak256("testNameSpace2");

    const contractAddressHandlerCI = wweb3.utils.keccak256("ContractAddressHandler");
    const rootCI = wweb3.utils.keccak256("root");

    //const WITHDRAW_SIG = wweb3.utils.keccak256("withdraw(address,address,uint)");
    //const DEPOSIT_SIG = wweb3.utils.keccak256("deposit(address,uint)");
    const WITHDRAW_SIG = "0xd9caed12";
    const DEPOSIT_SIG = "0x47e7ef24";

    before(async function () {
    });

    beforeEach(async function () {
        this.totalSpendMoney = 1000000;
        this.value = 10000;

        this.kernel = await Kernel.new();
        this.token = await Token.new();
        this.aclHandler = await ACLHandler.new(this.kernel.address);
        this.contractAddressHandler = await ContractAddressHandler.new(this.kernel.address);
        this.tokenCollectorModule = await TokenCollectorModule.new(this.kernel.address);

        // register Handler
        this.kernel.registerHandler(aclHandlerCI, this.aclHandler.address);
        this.kernel.registerHandler(contractAddressHandlerCI, this.contractAddressHandler.address);

        // connect
        this.kernel.connect(this.aclHandler.address, []);
        this.kernel.connect(this.contractAddressHandler.address, []);
        this.kernel.connect(this.tokenCollectorModule.address, [aclHandlerCI, contractAddressHandlerCI])
            .should.be.fulfilled;

        // register contract
        this.contractAddressHandler.registerContract(rootCI, root).should.be.fulfilled;

        // give permit for root address call registerOwner and setHandler
        this.aclHandler.permit(rootCI, tokenCollectorModuleCI, WITHDRAW_SIG).should.be.fulfilled;
        this.aclHandler.permit(rootCI, tokenCollectorModuleCI, DEPOSIT_SIG).should.be.fulfilled;

        // give tokenCollectorModule permission to speed root's money
        this.token.approve(this.tokenCollectorModule.address, this.totalSpendMoney).should.be.fulfilled;
    });

    describe('basic test', function () {
        it('should connected', async function () {
            var result = await this.tokenCollectorModule.isConnected.call();
            result.should.be.equal(true);
        });

        it('should register contract success', async function () {
            var result = await this.tokenCollectorModule.CI.call();
            result.should.be.equal(tokenCollectorModuleCI);
        });

        it('should receive correct handler', async function () {
            var result = await this.tokenCollectorModule.handlers.call(aclHandlerCI);
            result.should.be.equal(this.aclHandler.address);
            result = await this.tokenCollectorModule.handlers.call(contractAddressHandlerCI);
            result.should.be.equal(this.contractAddressHandler.address);
        });

        it('should receive correct kernel', async function () {
            var result = await this.tokenCollectorModule.kernel.call();
            result.should.be.equal(this.kernel.address);
        });

        it('should receive status connected', async function () {
            var result = await this.tokenCollectorModule.status.call();
            result.should.be.bignumber.equal(1);
        });

        it("should disconnect", async function () {
            await this.kernel.disconnect(this.tokenCollectorModule.address, [aclHandlerCI, contractAddressHandlerCI])
                .should.be.fulfilled;
            var result = await this.tokenCollectorModule.isConnected.call();
            result.should.be.equal(false);
        });

    });

    describe('branch test', function () {

        it('should rejected cause invalid token address', async function () {
            this.tokenCollectorModule.balanceOf("0x0").should.be.rejectedWith(EVMRevert);
            this.tokenCollectorModule.withdraw("0x0", root, 0).should.be.rejectedWith(EVMRevert);
            this.tokenCollectorModule.withdraw(this.token.address, "0x0", 0).should.be.rejectedWith(EVMRevert);
            this.tokenCollectorModule.deposit("0x0", 0).should.be.rejectedWith(EVMRevert);
        });

        it('should rejected when withdraw value over balance', async function () {
            this.tokenCollectorModule.withdraw(this.token.address, root, 1).should.be.rejectedWith(EVMRevert);
        });
    });

    describe('basic functional test', function () {
        it('should receive balance zero', async function () {
            const val = await this.tokenCollectorModule.balanceOf.call(this.token.address);
            val.should.be.bignumber.equal(0);
        });

        it('should approve success', async function () {
            const { logs } = await this.token.approve(this.tokenCollectorModule.address, this.totalSpendMoney)
                .should.be.fulfilled;
            const event = logs.find(e => e.event === "Approval");
            should.exist(event);
            event.args.owner.should.be.equal(root);
            event.args.spender.should.be.equal(this.tokenCollectorModule.address);
            event.args.value.should.be.bignumber.equal(this.totalSpendMoney);
        });

        it('should deposit success', async function () {
            const event = this.token.Transfer();

            const pre = await this.token.balanceOf.call(root);
            await this.tokenCollectorModule.deposit(this.token.address, this.value)
                .should.be.fulfilled;
            const post = await this.token.balanceOf.call(root);
            pre.minus(post).should.be.bignumber.equal(this.value);

            await event.watch((err, res) => {
                res.args.from.should.be.equal(root);
                res.args.to.should.be.equal(this.tokenCollectorModule.address);
                res.args.value.should.be.bignumber.equal(this.value);
            })
        });

        it('should withdraw success', async function () {
            const withdrawAmount = 200;

            const pre = await this.token.balanceOf.call(testAccount1);
            await this.tokenCollectorModule.deposit(this.token.address, this.value)
                .should.be.fulfilled;

            const event = this.token.Transfer();
            await this.tokenCollectorModule.withdraw(this.token.address, testAccount1, withdrawAmount)
                .should.be.fulfilled;
            const post = await this.token.balanceOf.call(testAccount1);
            post.minus(pre).should.be.bignumber.equal(withdrawAmount);

            const val = await this.tokenCollectorModule.balanceOf.call(this.token.address);
            val.should.be.bignumber.equal(this.value - withdrawAmount);

            await event.watch((err, res) => {
                res.args.from.should.be.equal(this.tokenCollectorModule.address);
                res.args.to.should.be.equal(testAccount1);
                res.args.value.should.be.bignumber.equal(withdrawAmount);
            })
        });
    });

});
