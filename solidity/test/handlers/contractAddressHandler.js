import {
  wweb3,
  Error,
  Kernel,
  ContractAddressHandler} from '../constants.js'

const shared = require('../shared.js')

const UNREGISTERED_CI = wweb3.utils.keccak256(
  'UnregisteredCI')

contract('ContractAddressHandlerTest', function (accounts) {
  const ROOT = accounts[0]

  let kernel
  let contractAddressHandler

  before(async function () {
    let context = await shared.run(accounts)
    kernel = context.kernel
    contractAddressHandler = context.contractAddressHandler
  })

  it('should reject cause already registered', async function () {
    contractAddressHandler.registerContract(Kernel.RootCI, ROOT)
      .should.be.rejectedWith(Error.EVMRevert)
  })

  it('should receive ROOT address', async function () {
    let address = await contractAddressHandler.contracts.call(Kernel.RootCI)
    address.should.be.equal(ROOT)
  })

  it('should reject cause unregistered contract', async function () {
    contractAddressHandler.unregisterContract(UNREGISTERED_CI)
      .should.be.rejectedWith(Error.EVMRevert)
  })

  it('should unregistered ROOT', async function () {
    let address = await contractAddressHandler.contracts.call(Kernel.RootCI)
    address.should.be.equal(ROOT)

    await contractAddressHandler.unregisterContract(Kernel.RootCI)
      .should.be.fulfilled
    address = await contractAddressHandler.contracts.call(Kernel.RootCI)
    address.should.not.be.equal(ROOT)
  })
})
