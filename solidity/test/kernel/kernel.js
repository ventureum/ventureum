import EVMRevert from 'openzeppelin-solidity/test/helpers/EVMRevert'

const wweb3 = require('web3')
const BigNumber = web3.BigNumber;

const should = require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .should();

const Kernel = artifacts.require('kernel/Kernel');

const CI1 = wweb3.utils.keccak256("KernelTest1");
const CI2 = wweb3.utils.keccak256("KernelTest2");
const CI3 = wweb3.utils.keccak256("KernelTest3");
const CI4 = wweb3.utils.keccak256("KernelTest4");
const CI5 = wweb3.utils.keccak256("KernelTest5");
const CI6 = wweb3.utils.keccak256("KernelTest6");
const CI7 = wweb3.utils.keccak256("KernelTest7");
const CI8 = wweb3.utils.keccak256("KernelTest8");
const CI9 = wweb3.utils.keccak256("KernelTest9");
const CI10 = wweb3.utils.keccak256("KernelTest10");
const INVALID_ADDRESS = "0xa0";


contract('KernelTest', function (
  [_, testAccount1, testAccount2, testAccount3, testAccount4, testAccount5]) {

    before(async function () {
        this.kernel = await Kernel.new();
    });

    describe('basic tests', function () {
        it('should return 0x0', async function () {
            let addr = await this.kernel.handlers.call(CI1)
            wweb3.utils.hexToNumber(addr).should.be.equal(0);
        });

        it('should reject register', async function () {
            await this.kernel.registerHandler(CI2, testAccount1)
                .should.be.fulfilled;
            await this.kernel.registerHandler(CI2, testAccount1)
                .should.be.rejectedWith(EVMRevert);
        });

        it('should return testAccount', async function () {
            await this.kernel.registerHandler(CI3, testAccount2)
              .should.be.fulfilled;
            let addr = await this.kernel.handlers.call(CI3);
            addr.should.be.equal(testAccount2);
        });

        it('should reject unregister', async function () {
            await this.kernel.unregisterHandler(CI4)
                .should.be.rejectedWith(EVMRevert);
        });

        it('should unregister success', async function () {
            await this.kernel.registerHandler(CI5, testAccount3)
                .should.be.fulfilled;
            await this.kernel.registerHandler(CI6, testAccount3)
                .should.be.fulfilled;
            await this.kernel.unregisterHandler(CI6).should.be.fulfilled;
            var addr = await this.kernel.handlers.call(CI6)
            wweb3.utils.hexToNumber(addr).should.be.equal(0);
        });

        it('register two same address should be fulfilled', async function () {
            await this.kernel.registerHandler(CI7, testAccount4)
                .should.be.fulfilled;
            await this.kernel.registerHandler(CI8, testAccount4)
                .should.be.fulfilled;
        });

        it('should reject by failed address require', async function () {
            const handlerList = [CI9];
            await this.kernel.connect(
                INVALID_ADDRESS, handlerList).should.be.rejectedWith(EVMRevert);
        });

        it('should reject by failed address require', async function () {
            const handlerList = [CI10];
            await this.kernel.registerHandler(CI10, testAccount5)
                .should.be.fulfilled;
            await this.kernel.connect(
                INVALID_ADDRESS, handlerList).should.be.rejectedWith(EVMRevert);
        });
    });

});
