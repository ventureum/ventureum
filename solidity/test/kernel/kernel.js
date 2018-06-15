import {
  wweb3,
  Error} from '../constants.js'
const shared = require('../shared.js')

const CI1 = wweb3.utils.keccak256('KernelTest1')
const CI2 = wweb3.utils.keccak256('KernelTest2')
const CI3 = wweb3.utils.keccak256('KernelTest3')
const CI4 = wweb3.utils.keccak256('KernelTest4')
const CI5 = wweb3.utils.keccak256('KernelTest5')
const CI6 = wweb3.utils.keccak256('KernelTest6')
const CI7 = wweb3.utils.keccak256('KernelTest7')
const CI8 = wweb3.utils.keccak256('KernelTest8')
const CI9 = wweb3.utils.keccak256('KernelTest9')
const CI10 = wweb3.utils.keccak256('KernelTest10')
const INVALID_ADDRESS = '0xa0'

contract('KernelTest', function (accounts) {

  const TEST_ACCOUNT1 = accounts[1];
  const TEST_ACCOUNT2 = accounts[2];
  const TEST_ACCOUNT3 = accounts[3];
  const TEST_ACCOUNT4 = accounts[4];
  const TEST_ACCOUNT5 = accounts[5];

  let kernel

  before(async function () {
    let context = await shared.run(accounts)
    kernel = context.kernel
  })

  describe('basic tests', function () {

    it('should return 0x0', async function () {
      let addr = await kernel.handlers.call(CI1)
      wweb3.utils.hexToNumber(addr).should.be.equal(0)
    })

    it('should reject register', async function () {
      await kernel.registerHandler(CI2, TEST_ACCOUNT1)
        .should.be.fulfilled
      await kernel.registerHandler(CI2, TEST_ACCOUNT1)
        .should.be.rejectedWith(Error.EVMRevert)
    })

    it('should return testAccount', async function () {
      await kernel.registerHandler(CI3, TEST_ACCOUNT2)
        .should.be.fulfilled
      let addr = await kernel.handlers.call(CI3)
      addr.should.be.equal(TEST_ACCOUNT2)
    })

    it('should reject unregister', async function () {
      await kernel.unregisterHandler(CI4)
        .should.be.rejectedWith(Error.EVMRevert)
    })

    it('should unregister success', async function () {
      await kernel.registerHandler(CI5, TEST_ACCOUNT3)
        .should.be.fulfilled
      await kernel.registerHandler(CI6, TEST_ACCOUNT3)
        .should.be.fulfilled
      await kernel.unregisterHandler(CI6).should.be.fulfilled
      let addr = await kernel.handlers.call(CI6)
      wweb3.utils.hexToNumber(addr).should.be.equal(0)
    })

    it('register two same address should be fulfilled', async function () {
      await kernel.registerHandler(CI7, TEST_ACCOUNT4)
        .should.be.fulfilled
      await kernel.registerHandler(CI8, TEST_ACCOUNT4)
        .should.be.fulfilled
    })

    it('should reject by failed address require', async function () {
      const handlerList = [CI9]
      await kernel.connect(
        INVALID_ADDRESS, handlerList).should.be.rejectedWith(Error.EVMRevert)
    })

    it('should reject by failed address require', async function () {
      const handlerList = [CI10]
      await kernel.registerHandler(CI10, TEST_ACCOUNT5)
        .should.be.fulfilled
      await kernel.connect(
        INVALID_ADDRESS, handlerList).should.be.rejectedWith(Error.EVMRevert)
    })
  })
})
