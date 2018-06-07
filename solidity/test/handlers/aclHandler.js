import EVMRevert from 'openzeppelin-solidity/test/helpers/EVMRevert'

const Web3 = require('web3');
const wweb3 = new Web3();

const should = require('chai')
    .use(require('chai-as-promised'))
    .should();

const MockedProjectController = artifacts.require(
    'mock/MockedProjectController');
const ACLHandler  = artifacts.require('handlers/ACLHandler');
const ContractAddressHandler = artifacts.require(
    'handlers/ContractAddressHandler');
const Kernel = artifacts.require('kernel/Kernel');

// CIs
const ACL_HANDLER_CI = wweb3.utils.keccak256("ACLHandler");
const MOCKED_PROJECT_CONTROLLER_CI = wweb3.utils.keccak256(
     "MockedProjectController");
const CONTRACT_ADDRESS_HANDLER_CI = wweb3.utils.keccak256(
    "ContractAddressHandler");
const ROOT_CI = wweb3.utils.keccak256("root");

// MockedProjectController function sig
const REGISTER_OWNER_SIG = wweb3.eth.abi.encodeFunctionSignature(
    "registerOwner(bytes32,address)");
const SET_STATE_SIG = wweb3.eth.abi.encodeFunctionSignature(
    "setState(bytes32,uint256)");

// namespace
const TEST_NAMESAPCE1 = wweb3.utils.keccak256("TEST_NAMESAPCE1");


contract('ACLHandlerTest', function (
    [root, _, testAccount1]) {

    before(async function () {
        this.kernel = await Kernel.new();
        this.aclHandler = await ACLHandler.new(this.kernel.address);
        this.contractAddressHandler = await ContractAddressHandler.new(
            this.kernel.address);
        this.mockedProjectController = await MockedProjectController.new(
            this.kernel.address);

        this.kernel.registerHandler(ACL_HANDLER_CI, this.aclHandler.address);
        this.kernel.registerHandler(
            CONTRACT_ADDRESS_HANDLER_CI,
            this.contractAddressHandler.address);
        this.kernel.connect(this.aclHandler.address, []);
        this.kernel.connect(this.contractAddressHandler.address, []);
        this.kernel.connect(
            this.mockedProjectController.address,
            [ACL_HANDLER_CI, CONTRACT_ADDRESS_HANDLER_CI]).should.be.fulfilled;

        // register contract
        this.contractAddressHandler.registerContract(
            ROOT_CI, root).should.be.fulfilled;

        // give permits for root address
        this.aclHandler.permit(
            ROOT_CI,
            MOCKED_PROJECT_CONTROLLER_CI,
            REGISTER_OWNER_SIG).should.be.fulfilled;
        this.aclHandler.permit(
            ROOT_CI,
            MOCKED_PROJECT_CONTROLLER_CI,
            SET_STATE_SIG).should.be.fulfilled;
    });

    it('should reject cause invalid srcCI (permit)', async function () {
        this.aclHandler.permit(
            "", MOCKED_PROJECT_CONTROLLER_CI, SET_STATE_SIG)
            .should.be.rejectedWith(EVMRevert);
        this.aclHandler.permit(ROOT_CI, "", SET_STATE_SIG)
            .should.be.rejectedWith(EVMRevert);
    });

    it('should rejected cause not from kernel', async function () {
        this.mockedProjectController.connect().should.be.rejectedWith(EVMRevert);
    });

    it('should reject cause invalid srcCI (forbid)', async function () {
        this.aclHandler.forbid(
            "", MOCKED_PROJECT_CONTROLLER_CI, SET_STATE_SIG)
            .should.be.rejectedWith(EVMRevert);
        this.aclHandler.forbid(
            ROOT_CI, "", SET_STATE_SIG)
            .should.be.rejectedWith(EVMRevert);
    });

    it('should reject cause already connected', async function () {
        this.kernel.connect(
          this.aclHandler.address, []).should.be.rejectedWith(EVMRevert);
    });

    it('should reject cause already disconnected', async function () {
        await this.kernel.disconnect(
          this.aclHandler.address, []).should.be.fulfilled;
        await this.kernel.disconnect(
          this.aclHandler.address, []).should.be.rejectedWith(EVMRevert);
    });


    it('should rejected by EVM Throw', async function () {
        await this.mockedProjectController.registerOwner(
            TEST_NAMESAPCE1, testAccount1).should.be.fulfilled;
        await this.mockedProjectController.setState(TEST_NAMESAPCE1, 2)
            .should.be.fulfilled;
        const { logs } = await this.aclHandler.forbid(
            ROOT_CI, MOCKED_PROJECT_CONTROLLER_CI, SET_STATE_SIG)
            .should.be.fulfilled;
        const event = logs.find(e => e.event === 'LogForbid');
        should.exist(event);
        event.args.src.should.equal(ROOT_CI);
        event.args.dst.should.equal(MOCKED_PROJECT_CONTROLLER_CI);

        let expectSig = (SET_STATE_SIG + "0".repeat(66)).substring(0, 66);
        event.args.sig.should.equal(expectSig);
        await this.mockedProjectController.setState(TEST_NAMESAPCE1, 2)
            .should.be.rejectedWith(EVMRevert);
    })

    it('should log permit', async function () {
        const testSig = wweb3.utils.keccak256("TEST_SIG");
        const { logs } = await this.aclHandler.permit(
          ROOT_CI, MOCKED_PROJECT_CONTROLLER_CI, testSig).should.be.fulfilled;
        const event = logs.find(e => e.event === 'LogPermit');
        should.exist(event);
        event.args.src.should.equal(ROOT_CI);
        event.args.dst.should.equal(MOCKED_PROJECT_CONTROLLER_CI);
        event.args.sig.should.equal(testSig);
    })
});
