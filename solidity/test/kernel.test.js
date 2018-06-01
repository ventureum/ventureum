import EVMRevert from 'openzeppelin-solidity/test/helpers/EVMRevert'

const wweb3 = require('web3')
const BigNumber = web3.BigNumber;

const should = require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .should();

const Kernel = artifacts.require('kernel/Kernel');

contract('KernelTest', function ([_, testAccount]) {

    const CI = wweb3.utils.keccak256("KernelTest1");
    const CI2 = wweb3.utils.keccak256("KernelTest2");
    const INVALID_ADDRESS = "0xa0";

    before(async function () {
    });

    beforeEach(async function () {
        this.kernel = await Kernel.new();
    });

    describe('basic tests', function () {
        it('should return 0x0', async function () {
            var addr = await this.kernel.handlers.call(CI)
            wweb3.utils.hexToNumber(addr).should.be.equal(0);
        });

        it('should reject register', async function () {
            await this.kernel.registerHandler(CI, testAccount).should.be.fulfilled;
            await this.kernel.registerHandler(CI, testAccount).should.be.rejectedWith(EVMRevert);
        });

        it('should return testAccount', async function () {
            await this.kernel.registerHandler(CI, testAccount).should.be.fulfilled;
            var addr = await this.kernel.handlers.call(CI);
            addr.should.be.equal(testAccount);
        });

        it('should reject unregister', async function () {
            await this.kernel.unregisterHandler(CI).should.be.rejectedWith(EVMRevert);
        });

        it('should unregister success', async function () {
            await this.kernel.registerHandler(CI, testAccount).should.be.fulfilled;
            await this.kernel.registerHandler(CI2, testAccount).should.be.fulfilled;
            await this.kernel.unregisterHandler(CI2).should.be.fulfilled;
            var addr = await this.kernel.handlers.call(CI2)
            wweb3.utils.hexToNumber(addr).should.be.equal(0);
        });

        it('register two same address should be fulfilled', async function () {
            await this.kernel.registerHandler(CI, testAccount).should.be.fulfilled;
            await this.kernel.registerHandler(CI2, testAccount).should.be.fulfilled;
        });

        it('should reject by failed address require', async function () {
            const handlerList = [CI];
            await this.kernel.connect(INVALID_ADDRESS, handlerList).should.be.rejectedWith(EVMRevert);
        });

        it('should reject by failed address require', async function () {
            const handlerList = [CI];
            await this.kernel.registerHandler(CI, testAccount).should.be.fulfilled;
            await this.kernel.connect(INVALID_ADDRESS, handlerList).should.be.rejectedWith(EVMRevert);
        });
    });

});
