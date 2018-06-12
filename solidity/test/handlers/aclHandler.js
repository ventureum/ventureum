import {
  should,
  wweb3,
  Error,
  Kernel,
  ACLHandler,
  ContractAddressHandler,
  MockedProjectController,
  MockedProjectController2} from '../constants.js'
const shared = require('../shared.js')

// namespace
const TEST_NAMESAPCE1 = wweb3.utils.keccak256('TEST_NAMESAPCE1')

contract('ACLHandlerTest', function (accounts) {
  const TEST_ACCOUNT1 = accounts[3]

  let kernel
  let aclHandler
  let contractAddressHandler
  let mockedProjectController
  let mockedProjectController2

  before(async function () {
    let context = await shared.run(accounts)
    kernel = context.kernel
    aclHandler = context.aclHandler
    contractAddressHandler = context.contractAddressHandler

    mockedProjectController = await MockedProjectController.Self.new(
      kernel.address)

    mockedProjectController2 = await MockedProjectController2.Self.new(
      kernel.address)

    // register contract
    await contractAddressHandler.registerContract(
      MockedProjectController.CI, mockedProjectController.address)
    await contractAddressHandler.registerContract(
      MockedProjectController2.CI, mockedProjectController2.address)

    await kernel.connect(
      mockedProjectController.address,
      [ACLHandler.CI, ContractAddressHandler.CI])
    await kernel.connect(
      mockedProjectController2.address,
      [ACLHandler.CI, ContractAddressHandler.CI])

    // give permits for root address
    await aclHandler.permit(
      Kernel.RootCI,
      MockedProjectController.CI,
      [
        MockedProjectController.Sig.RegisterOwner,
        MockedProjectController.Sig.SetState
      ])
  })

  it('should reject cause invalid srcCI (permit)', async function () {
    aclHandler.permit(
      '', MockedProjectController.CI, [MockedProjectController.Sig.SetState])
      .should.be.rejectedWith(Error.EVMRevert)
    aclHandler.permit(Kernel.RootCI, '', [MockedProjectController.Sig.SetState])
      .should.be.rejectedWith(Error.EVMRevert)
  })

  it('should rejected cause not from kernel', async function () {
    mockedProjectController.connect().should.be.rejectedWith(Error.EVMRevert)
  })

  it('should reject cause invalid srcCI (forbid)', async function () {
    aclHandler.forbid(
      '', MockedProjectController.CI, [MockedProjectController.Sig.SetState])
      .should.be.rejectedWith(Error.EVMRevert)
    aclHandler.forbid(
      Kernel.RootCI, '', [MockedProjectController.Sig.SetState])
      .should.be.rejectedWith(Error.EVMRevert)
  })

  it('should reject cause already connected', async function () {
    kernel.connect(
      aclHandler.address, []).should.be.rejectedWith(Error.EVMRevert)
  })

  it('should reject cause already disconnected', async function () {
    // Note: do not use mockedProjectController. Otherwise, racing conditions
    // will cause errors in other test cases
    kernel.disconnect(
      mockedProjectController2.address,
      [ACLHandler.CI, ContractAddressHandler.CI])
    kernel.disconnect(
      mockedProjectController2.address,
      [ACLHandler.CI, ContractAddressHandler.CI])
      .should.be.rejectedWith(Error.EVMRevert)
  })

  it('should rejected by EVM Throw', async function () {
    await mockedProjectController.registerOwner(
      TEST_NAMESAPCE1, TEST_ACCOUNT1).should.be.fulfilled
    await mockedProjectController.setState(TEST_NAMESAPCE1, 2)
      .should.be.fulfilled
    const { logs } = await aclHandler.forbid(
      Kernel.RootCI,
      MockedProjectController.CI,
      [MockedProjectController.Sig.SetState]).should.be.fulfilled
    const event = logs.find(e => e.event === 'LogForbid')
    should.exist(event)
    event.args.src.should.equal(Kernel.RootCI)
    event.args.dst.should.equal(MockedProjectController.CI)

    let expectSig = (MockedProjectController.Sig.SetState +
      '0'.repeat(66)).substring(0, 66)
    assert.deepEqual(event.args.sig, [expectSig])
    await mockedProjectController.setState(TEST_NAMESAPCE1, 2)
      .should.be.rejectedWith(Error.EVMRevert)
  })

  it('should log permit', async function () {
    const testSig = wweb3.utils.keccak256('TEST_SIG')
    const { logs } = await aclHandler.permit(
      Kernel.RootCI, MockedProjectController.CI, [testSig]).should.be.fulfilled
    const event = logs.find(e => e.event === 'LogPermit')
    should.exist(event)
    event.args.src.should.equal(Kernel.RootCI)
    event.args.dst.should.equal(MockedProjectController.CI)
    assert.deepEqual(event.args.sig, [testSig])
  })
})
