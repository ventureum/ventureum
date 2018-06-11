import {
  should,
  wweb3,
  Error,
  ACLHandler,
  ContractAddressHandler,
  ProjectController,
  ProjectControllerStorage} from "../../contants.js";
const shared = require("../../shared.js");

// namespaces
const TEST_NAMESPACE1 = wweb3.utils.keccak256("TEST_NAMESPACE1");
const TEST_NAMESPACE2 = wweb3.utils.keccak256("TEST_NAMESPACE2");
const TEST_NAMESPACE3 = wweb3.utils.keccak256("TEST_NAMESPACE3");
const TEST_NAMESPACE4 = wweb3.utils.keccak256("TEST_NAMESPACE4");
const TEST_NAMESPACE5 = wweb3.utils.keccak256("TEST_NAMESPACE5");


contract("Project Handler", function (accounts) {
  const TEST_ACCOUNT1 = accounts[1];
  const TEST_ACCOUNT2 = accounts[2];
  const TEST_ACCOUNT3 = accounts[3];
  const TEST_ACCOUNT4 = accounts[4];
  const TEST_ACCOUNT5 = accounts[5];

  let token;
  let kernel;
  let aclHandler;
  let contractAddressHandler;
  let projectController;
  let projectControllerStorage;
  let tokenAddress;

  before(async function () {
    let context = await shared.run(accounts);
    token = context.token;
    kernel = context.kernel;
    projectControllerStorage = context.projectControllerStorage;
    projectController = context.projectController;
    contractAddressHandler = context.contractAddressHandler;
    aclHandler = context.aclHandler;
    tokenAddress = token.address;
  });


  it("should be connected successfully", async function () {
    let result = await projectController.isConnected.call();
    result.should.be.equal(true);

    result = await projectControllerStorage.isConnected.call();
    result.should.be.equal(true);
  });

  it("should register contract successfully", async function () {
    let result = await projectController.CI.call();
    result.should.be.equal(ProjectController.CI);

    result = await projectControllerStorage.CI.call();
    result.should.be.equal(ProjectController.Storage.CI);
  });

  it("should set/get uint correctly", async function () {
    let value = 100;
    let key = "789";
    await projectControllerStorage.setUint(key, value)
      .should.be.fulfilled;
    let result = await projectControllerStorage.getUint.call(key);
    result.should.be.bignumber.equal(value);
  })

  it("should set/get bytes32 correctly", async function () {
    let value = wweb3.utils.keccak256("value");
    let key = "456";
    await projectControllerStorage.setBytes32(key, value)
      .should.be.fulfilled;
    let result = await projectControllerStorage.getBytes32.call(key);
    result.should.be.equal(value);
  })

  it("should set/get address correctly", async function () {
    let value = token.address;
    let key = "123";
    await projectControllerStorage.setAddress(key, value)
      .should.be.fulfilled;
    let result = await projectControllerStorage.getAddress.call(key);
    result.should.be.equal(value);
  })

  it("should register project successfully", async function () {
    // register project
    await projectController.registerProject(
      TEST_NAMESPACE1, TEST_ACCOUNT1, tokenAddress).should.be.fulfilled;

    let namespace = await projectController.getNamespace.call(
      TEST_ACCOUNT1);
    namespace.should.be.equal(TEST_NAMESPACE1);

    let token = await projectController.getTokenAddress.call(
      TEST_NAMESPACE1);
    token.should.be.equal(tokenAddress);

    let isOwner = await projectController.verifyOwner.call(
      TEST_NAMESPACE1, TEST_ACCOUNT1);
    isOwner.should.be.true;

    let projectState = await projectController.getProjectState.call(
      TEST_NAMESPACE1);
    projectState.should.be.bignumber.equal(1);
  });

  it("should unregister project successfully", async function () {
    // register project
    await projectController.registerProject(
      TEST_NAMESPACE2, TEST_ACCOUNT2, tokenAddress).should.be.fulfilled;

    // unregister project
    await projectController.unregisterProject(TEST_NAMESPACE2)
      .should.be.fulfilled;

    let namespace = await projectController.getNamespace.call(
      TEST_ACCOUNT2);
    namespace.should.not.equal(TEST_NAMESPACE2);

    await projectController.getTokenAddress.call(
      TEST_NAMESPACE2).should.be.rejectedWith(Error.EVMRevert);

    let isOwner = await projectController.verifyOwner.call(
      TEST_NAMESPACE2, TEST_ACCOUNT2);
    isOwner.should.be.false;

    await projectController.getProjectState.call(
      TEST_NAMESPACE2).should.be.rejectedWith(Error.EVMRevert);
  });

  it("should set state successfully", async function () {
    await projectController.registerProject(
      TEST_NAMESPACE3, TEST_ACCOUNT3, tokenAddress).should.be.fulfilled;
    await projectController.setState(
      TEST_NAMESPACE3, 2).should.be.fulfilled;
    let result = await projectController.getProjectState.call(
      TEST_NAMESPACE3);
    result.should.be.bignumber.equal(2);
  });

  it("should receive correct handler", async function () {
    let result = await projectController.handlers
    .call(ACLHandler.CI);
    result.should.be.equal(aclHandler.address);

    result = await projectController.handlers
    .call(ContractAddressHandler.CI);
    result.should.be.equal(contractAddressHandler.address);
  });

  it("should receive correct kernel", async function () {
    let result = await projectController.kernel.call();
    result.should.be.equal(kernel.address);
  });

  it("should receive status connected", async function () {
    let result = await projectController.status.call();
    result.should.be.bignumber.equal(1);
  });

  it("should rejected by EVM Revert if state does not exist", async function () {
    await projectController.registerProject(
      TEST_NAMESPACE4, TEST_ACCOUNT4, tokenAddress).should.be.fulfilled;
    projectController.setState(TEST_NAMESPACE4, 100)
      .should.be.rejectedWith(Error.EVMRevert);
  });

  it("should reject cause double register", async function () {
    await projectController.registerProject(
      TEST_NAMESPACE5, TEST_ACCOUNT5, tokenAddress)
        .should.be.fulfilled;
    await projectController.registerProject(
      TEST_NAMESPACE5, TEST_ACCOUNT5, tokenAddress)
        .should.be.rejectedWith(Error.EVMRevert);
  });
});
