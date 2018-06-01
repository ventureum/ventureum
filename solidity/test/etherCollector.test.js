import EVMRevert from 'openzeppelin-solidity/test/helpers/EVMRevert'
import EVMThrow from 'openzeppelin-solidity/test/helpers/EVMThrow'

const wweb3 = require('web3')
const BigNumber = web3.BigNumber;

const should = require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .should();

const Kernel = artifacts.require('kernel/Kernel');

const EtherCollector = artifacts.require('collector/EtherCollector');
const EtherCollectorStorage = artifacts.require('collector/EtherCollectorStorage');

const ACLHandler  = artifacts.require('handler/ACLHandler');
const ContractAddressHandler = artifacts.require('handler/ContractAddressHandler');

contract('EtherCollectorTest', function ([root, _, testAccount1, testAccount2]) {

    const aclHandlerCI = wweb3.utils.keccak256("ACLHandler");
    const contractAddressHandlerCI = wweb3.utils.keccak256("ContractAddressHandler");
    const balance = wweb3.utils.keccak256("balance");
    const rootCI = wweb3.utils.keccak256("root");

    const etherCollectorCI = wweb3.utils.keccak256("EtherCollector");
    const etherCollectorStorageCI = wweb3.utils.keccak256("EtherCollectorStorage");

    const testNameSpace1 = wweb3.utils.keccak256("testNameSpace1");
    const testNameSpace2 = wweb3.utils.keccak256("testNameSpace2");


    //SIG
    const SET_STORAGE_SIG = "0x9137c1a7";
    const DEPOSIT_SIG = "0xd0e30db0";

    const SET_UINT_SIG = "0xe2a4853a";
    const GET_UINT_SIG = "0xbd02d0f5";
    const WITHDRAW_SIG = "0xf3fef3a3";


    before(async function () {
    });

    beforeEach(async function () {
        this.value = 12345;

        this.kernel = await Kernel.new();
        this.aclHandler = await ACLHandler.new(this.kernel.address);
        this.contractAddressHandler = await ContractAddressHandler.new(this.kernel.address);

        this.kernel.registerHandler(aclHandlerCI, this.aclHandler.address);
        this.kernel.registerHandler(contractAddressHandlerCI, this.contractAddressHandler.address);

        this.kernel.connect(this.aclHandler.address, []);
        this.kernel.connect(this.contractAddressHandler.address, []);

        this.etherCollector = await EtherCollector.new(this.kernel.address);
        this.etherCollectorStorage = await EtherCollectorStorage.new(this.kernel.address);

        this.kernel.connect(this.etherCollector.address, [aclHandlerCI, contractAddressHandlerCI]).should.be
            .fulfilled;
        this.kernel.connect(this.etherCollectorStorage.address, [aclHandlerCI, contractAddressHandlerCI]).should
            .be.fulfilled;

        // register contract
        this.contractAddressHandler.registerContract(rootCI, root).should.be.fulfilled;
        this.contractAddressHandler.registerContract(etherCollectorCI, this.etherCollector.address).should.be.fulfilled;
        this.contractAddressHandler.registerContract(etherCollectorStorageCI, this.etherCollectorStorage.address)
            .should.be.fulfilled;

        // give permit for root address call registerOwner and setHandler
        this.aclHandler.permit(rootCI, etherCollectorCI, SET_STORAGE_SIG).should.be.fulfilled;
        this.aclHandler.permit(rootCI, etherCollectorCI, DEPOSIT_SIG).should.be.fulfilled;
        this.aclHandler.permit(rootCI, etherCollectorCI, WITHDRAW_SIG).should.be.fulfilled;

        this.aclHandler.permit(rootCI, etherCollectorStorageCI, SET_UINT_SIG).should.be.fulfilled;
        this.aclHandler.permit(rootCI, etherCollectorStorageCI, GET_UINT_SIG).should.be.fulfilled;

    });

    describe('EtherCollector basic test', function () {
        it('should connected', async function () {
            var result = await this.etherCollector.isConnected.call();
            result.should.be.equal(true);
        });

        it('should register contract success', async function () {
            var result = await this.etherCollector.CI.call();
            result.should.be.equal(etherCollectorCI);
        });

        it('should set storage success', async function () {
            await this.etherCollector.setStorage(this.etherCollectorStorage.address).should.be.fulfilled;
        });

    });

    describe('EtherCollectorStorage basic test', function () {
        it('should connected', async function () {
            var result = await this.etherCollectorStorage.isConnected.call();
            result.should.be.equal(true);
        });

        it('should register contract success', async function () {
            var result = await this.etherCollectorStorage.CI.call();
            result.should.be.equal(etherCollectorStorageCI);
        });

        it('should set/get uint correctly', async function () {
            await this.etherCollectorStorage.setUint(balance, this.value).should.be.fulfilled;
            var result = await this.etherCollectorStorage.getUint.call(balance);
            result.should.be.bignumber.equal(this.value);
        })
    });

    describe('composite test', function () {
        beforeEach(async function () {
            await this.etherCollector.setStorage(this.etherCollectorStorage.address).should.be.fulfilled;
        });

        it('should deposit success', async function () {

            await this.aclHandler.permit(etherCollectorCI, etherCollectorStorageCI, SET_UINT_SIG).should.be.fulfilled;

            //const pre = web3.eth.getBalance(root);
            await this.etherCollector.deposit({value: this.value}).should.be.fulfilled;
            //const post = web3.eth.getBalance(root);
            //pre.mins(pre).should.be.bignumber.equal(value);

            var result = await this.etherCollectorStorage.getUint.call(balance);
            result.should.be.bignumber.equal(this.value);
        });

        it('should withdraw success', async function () {
            await this.aclHandler.permit(etherCollectorCI, etherCollectorStorageCI, SET_UINT_SIG).should.be.fulfilled;
            await this.etherCollector.deposit({value: this.value}).should.be.fulfilled;

            await this.etherCollector.withdraw(testAccount1, this.value - 10000).should.be.fulfilled;

            var result = await this.etherCollectorStorage.getUint.call(balance);
            result.should.be.bignumber.equal(10000);

        });

    });

    describe('branch test', function () {
        beforeEach(async function () {
            await this.etherCollector.setStorage(this.etherCollectorStorage.address).should.be.fulfilled;
        });

        it('should rejected by EVM Throw', async function () {
            await this.etherCollector.deposit({value: this.value}).should.be.rejectedWith(EVMRevert);
        });

        it('should rejected withdraw ', async function () {
            await this.aclHandler.permit(etherCollectorCI, etherCollectorStorageCI, SET_UINT_SIG).should.be.fulfilled;
            await this.etherCollector.deposit({value: this.value}).should.be.fulfilled;

            await this.etherCollector.withdraw(testAccount1, 1 + this.value).should.be.rejectedWith(EVMRevert);
        });

        it('should rejected withdraw cause not connected', async function () {
            await this.kernel.disconnect(this.etherCollector.address, [aclHandlerCI, contractAddressHandlerCI])
                .should.be.fulfilled;
            await this.etherCollector.withdraw(testAccount1, this.value).should.be.rejectedWith(EVMRevert);
        });
    });
});
