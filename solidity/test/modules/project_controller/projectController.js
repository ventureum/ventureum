import EVMRevert from "openzeppelin-solidity/test/helpers/EVMRevert";

const Web3 = require("web3");
const wweb3 = new Web3();
const BigNumber = wweb3.BigNumber;
const should = require("chai")
    .use(require("chai-as-promised"))
    .use(require("chai-bignumber")(BigNumber))
    .should();

const ProjectController = artifacts.require(
    "modules/project_controller/ProjectController");
const ProjectControllerStorage = artifacts.require(
    "modules/project_controller/ProjectControllerStorage");
const ACLHandler  = artifacts.require("handlers/ACLHandler");
const ContractAddressHandler = artifacts.require(
    "handlers/ContractAddressHandler");
const Kernel = artifacts.require("kernel/Kernel");

// CIs
const ACL_HANDLER_CI = wweb3.utils.keccak256("ACLHandler");
const PROJECT_CONTROLLER_CI = wweb3.utils.keccak256(
     "ProjectController");
const PROJECT_CONTROLLER_STORAGE_CI = wweb3.utils.keccak256(
     "ProjectControllerStorage");
const CONTRACT_ADDRESS_HANDLER_CI = wweb3.utils.keccak256(
    "ContractAddressHandler");
const ROOT_CI = wweb3.utils.keccak256("root");

// ProjectController function sig
const REGISTER_PROJECT_SIG = wweb3.eth.abi.encodeFunctionSignature(
    "registerProject(bytes32,address,address)");
const UNREGISTER_PROJECT_SIG = wweb3.eth.abi.encodeFunctionSignature(
    "unregisterProject(bytes32)");
const SET_STATE_SIG = wweb3.eth.abi.encodeFunctionSignature(
    "setState(bytes32,uint256)");
const SET_STORAGE_SIG = wweb3.eth.abi.encodeFunctionSignature(
    "setStorage(address)");

// ProjectControllerStorage function sig
const SET_UINT_SIG = wweb3.eth.abi.encodeFunctionSignature(
  "setUint(bytes32,uint256)");
const SET_ADDRESS_SIG = wweb3.eth.abi.encodeFunctionSignature(
  "setAddress(bytes32,address)");
const SET_BYTES32_SIG = wweb3.eth.abi.encodeFunctionSignature(
  "setBytes32(bytes32,bytes32)");


// namespaces
const TEST_NAMESPACE1 = wweb3.utils.keccak256("TEST_NAMESPACE1");
const TEST_NAMESPACE2 = wweb3.utils.keccak256("TEST_NAMESPACE2");
const TEST_NAMESPACE3 = wweb3.utils.keccak256("TEST_NAMESPACE3");
const TEST_NAMESPACE4 = wweb3.utils.keccak256("TEST_NAMESPACE4");
const TEST_NAMESPACE5 = wweb3.utils.keccak256("TEST_NAMESPACE5");


contract("ProjectControllerTest", function ([
    root,
    testAccount1,
    testAccount2,
    testAccount3,
    testAccount4,
    testAccount5,
    tokenAddress]) {

    before(async function () {
        this.kernel = await Kernel.new();
        this.aclHandler = await ACLHandler.new(this.kernel.address);
        this.contractAddressHandler = await ContractAddressHandler.new(
            this.kernel.address);
        this.projectController = await ProjectController.new(
            this.kernel.address);
        this.projectControllerStorage = await ProjectControllerStorage.new(
            this.kernel.address);

        this.kernel.registerHandler(ACL_HANDLER_CI, this.aclHandler.address);
        this.kernel.registerHandler(
            CONTRACT_ADDRESS_HANDLER_CI,
            this.contractAddressHandler.address);

        this.kernel.connect(this.aclHandler.address, []);
        this.kernel.connect(this.contractAddressHandler.address, []);
        this.kernel.connect(
            this.projectController.address,
            [ACL_HANDLER_CI, CONTRACT_ADDRESS_HANDLER_CI]).should.be.fulfilled;
        this.kernel.connect(
            this.projectControllerStorage.address,
            [ACL_HANDLER_CI, CONTRACT_ADDRESS_HANDLER_CI]).should.be.fulfilled;

        // register contracts
        this.contractAddressHandler.registerContract(
            ROOT_CI, root).should.be.fulfilled;
        this.contractAddressHandler.registerContract(
            PROJECT_CONTROLLER_CI,
            this.projectController.address).should.be.fulfilled;
        this.contractAddressHandler.registerContract(
            PROJECT_CONTROLLER_STORAGE_CI,
            this.projectControllerStorage.address).should.be.fulfilled;

        // give permits
        this.aclHandler.permit(
            ROOT_CI,
            PROJECT_CONTROLLER_STORAGE_CI,
            SET_ADDRESS_SIG).should.be.fulfilled;
        this.aclHandler.permit(
            ROOT_CI,
            PROJECT_CONTROLLER_STORAGE_CI,
            SET_BYTES32_SIG).should.be.fulfilled;
        this.aclHandler.permit(
            ROOT_CI,
            PROJECT_CONTROLLER_STORAGE_CI,
            SET_UINT_SIG).should.be.fulfilled;

        this.aclHandler.permit(
            ROOT_CI,
            PROJECT_CONTROLLER_CI,
            REGISTER_PROJECT_SIG).should.be.fulfilled;
        this.aclHandler.permit(
            ROOT_CI,
            PROJECT_CONTROLLER_CI,
            UNREGISTER_PROJECT_SIG).should.be.fulfilled;
        this.aclHandler.permit(
            ROOT_CI,
            PROJECT_CONTROLLER_CI,
            SET_STATE_SIG).should.be.fulfilled;
        this.aclHandler.permit(
            ROOT_CI,
            PROJECT_CONTROLLER_CI,
            SET_STORAGE_SIG).should.be.fulfilled;

        this.aclHandler.permit(
            PROJECT_CONTROLLER_CI,
            PROJECT_CONTROLLER_STORAGE_CI,
            SET_UINT_SIG).should.be.fulfilled;
        this.aclHandler.permit(
            PROJECT_CONTROLLER_CI,
            PROJECT_CONTROLLER_STORAGE_CI,
            SET_ADDRESS_SIG).should.be.fulfilled;
        this.aclHandler.permit(
            PROJECT_CONTROLLER_CI,
            PROJECT_CONTROLLER_STORAGE_CI,
            SET_BYTES32_SIG).should.be.fulfilled;

        // connect projectControllerStorage
        await this.projectController.setStorage(
            this.projectControllerStorage.address).should.be.fulfilled;
    });


    it("should be connected successfully", async function () {
        let result = await this.projectController.isConnected.call();
        result.should.be.equal(true);

        result = await this.projectControllerStorage.isConnected.call();
        result.should.be.equal(true);
    });

    it("should register contract successfully", async function () {
        let result = await this.projectController.CI.call();
        result.should.be.equal(PROJECT_CONTROLLER_CI);

        result = await this.projectControllerStorage.CI.call();
        result.should.be.equal(PROJECT_CONTROLLER_STORAGE_CI);
    });

    it("should set/get uint correctly", async function () {
        let value = 100;
        let key = "123";
        await this.projectControllerStorage.setUint(key, value)
            .should.be.fulfilled;
        let result = await this.projectControllerStorage.getUint.call(key);
        result.should.be.bignumber.equal(value);
    })

    it("should set/get bytes32 correctly", async function () {
        let value = wweb3.utils.keccak256("value");
        let key = "123";
        await this.projectControllerStorage.setUint(key, value)
            .should.be.fulfilled;
        let result = await this.projectControllerStorage.getUint.call(key);
        result.should.be.bignumber.equal(value);
    })

    it("should set/get address correctly", async function () {
        let value = tokenAddress;
        let key = "123";
        await this.projectControllerStorage.setAddress(key, value)
            .should.be.fulfilled;
        let result = await this.projectControllerStorage.getAddress.call(key);
        result.should.be.equal(value);
    })

    it("should register project successfully", async function () {
        // register project
        await this.projectController.registerProject(
            TEST_NAMESPACE1, testAccount1, tokenAddress).should.be.fulfilled;

        let namespace = await this.projectController.getNamespace.call(
            testAccount1);
        namespace.should.be.equal(TEST_NAMESPACE1);

        let token = await this.projectController.getTokenAddress.call(
            TEST_NAMESPACE1);
        token.should.be.equal(tokenAddress);

        let isOwner = await this.projectController.verifyOwner.call(
            TEST_NAMESPACE1, testAccount1);
        isOwner.should.be.true;

        let projectState = await this.projectController.getProjectState.call(
            TEST_NAMESPACE1);
        projectState.should.be.bignumber.equal(1);
    });

    it("should unregister project successfully", async function () {
        // register project
        await this.projectController.registerProject(
            TEST_NAMESPACE2, testAccount2, tokenAddress).should.be.fulfilled;

        // unregister project
        await this.projectController.unregisterProject(TEST_NAMESPACE2)
            .should.be.fulfilled;

        let namespace = await this.projectController.getNamespace.call(
            testAccount2);
        namespace.should.not.equal(TEST_NAMESPACE2);

        await this.projectController.getTokenAddress.call(
            TEST_NAMESPACE2).should.be.rejectedWith(EVMRevert);

        let isOwner = await this.projectController.verifyOwner.call(
            TEST_NAMESPACE2, testAccount2);
        isOwner.should.be.false;

        await this.projectController.getProjectState.call(
            TEST_NAMESPACE2).should.be.rejectedWith(EVMRevert);
    });

    it("should set state successfully", async function () {
        await this.projectController.registerProject(
            TEST_NAMESPACE3, testAccount3, tokenAddress).should.be.fulfilled;
        await this.projectController.setState(
            TEST_NAMESPACE3, 2).should.be.fulfilled;
        let result = await this.projectController.getProjectState.call(
            TEST_NAMESPACE3);
        result.should.be.bignumber.equal(2);
    });

    it("should receive correct handler", async function () {
        let result = await this.projectController.handlers
            .call(ACL_HANDLER_CI);
        result.should.be.equal(this.aclHandler.address);

        result = await this.projectController.handlers
            .call(CONTRACT_ADDRESS_HANDLER_CI);
        result.should.be.equal(this.contractAddressHandler.address);
    });

    it("should receive correct kernel", async function () {
        let result = await this.projectController.kernel.call();
        result.should.be.equal(this.kernel.address);
    });

    it("should receive status connected", async function () {
        let result = await this.projectController.status.call();
        result.should.be.bignumber.equal(1);
    });

    it("should rejected by EVM Revert if state does not exist", async function () {
        await this.projectController.registerProject(
            TEST_NAMESPACE4, testAccount4, tokenAddress).should.be.fulfilled;
        this.projectController.setState(TEST_NAMESPACE4, 100)
            .should.be.rejectedWith(EVMRevert);
    });

    it("should reject cause double register", async function () {
        await this.projectController.registerProject(
            TEST_NAMESPACE5, testAccount5, tokenAddress)
            .should.be.fulfilled;
        await this.projectController.registerProject(
            TEST_NAMESPACE5, testAccount5, tokenAddress)
            .should.be.rejectedWith(EVMRevert);
    });
});
