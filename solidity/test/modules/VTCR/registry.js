import {
  wweb3,
  Error,
  fs,
  ACLHandler,
  ContractAddressHandler,
  Registry,
  MockedSale,
  ProjectController,
  Parameterizer
} from '../../constants'
const shared = require('../../shared.js')

const PROJECT_LIST = ['project #0', 'project #1', 'project #2', 'project #3']

contract('Registry', (accounts) => {
  const ROOT_ACCOUNT = accounts[0]

  let kernel
  let aclHandler
  let contractAddressHandler
  let projectController

  let parameterizerConfig
  let mockedSale
  let registry
  let tokenAdd
  let token

  before(async () => {
    let context = await shared.run(accounts)
    kernel = context.kernel
    aclHandler = context.aclHandler
    contractAddressHandler = context.contractAddressHandler
    projectController = context.projectController
    token = context.vetXToken
    registry = context.registry

    parameterizerConfig = Parameterizer.paramDefaults

    mockedSale = await MockedSale.Self.new(token.address)

    let totalAmount = await token.balanceOf(ROOT_ACCOUNT);
    await token.transfer(mockedSale.address, totalAmount)

    await mockedSale.purchaseTokens(
      {from: ROOT_ACCOUNT, value: parameterizerConfig.initialTokenPurchase})
    tokenAdd = token.address
  })

  describe('Project applications', () => {
    it('One new application', async () => {
      await token.approve(registry.address, parameterizerConfig.minDeposit)
      await registry.apply(PROJECT_LIST[0], parameterizerConfig.minDeposit)
    })

    it('Two different projects', async () => {
      await token.approve(registry.address, parameterizerConfig.minDeposit)
      await registry.apply(PROJECT_LIST[1], parameterizerConfig.minDeposit)

      await token.approve(registry.address, parameterizerConfig.minDeposit)
      await registry.apply(PROJECT_LIST[2], parameterizerConfig.minDeposit)
    })

    it('Duplicate project rejected', async () => {
      await token.approve(registry.address, parameterizerConfig.minDeposit)
      await registry.apply(
        PROJECT_LIST[0],
        parameterizerConfig.minDeposit
      ).should.be.rejectedWith(Error.EVMRevert)
    })

    it('Exit a appication', async () => {
      await registry.exit(PROJECT_LIST[1])
    })
  })

  describe('Challenges', () => {
    it('A new challenge to existing application', async () => {
      await token.approve(registry.address, parameterizerConfig.minDeposit)
      await registry.challenge(PROJECT_LIST[0])
    })

    it('A new challenge to non-existing application', async () => {
      await token.approve(registry.address, parameterizerConfig.minDeposit)
      await registry.challenge(
        PROJECT_LIST[3]
      ).should.be.rejectedWith(Error.EVMRevert)
    })
  })

  describe('Register token address to a project', () => {
    it('Register token addres to a existing project', async () => {
      const projectHash = wweb3.utils.keccak256(PROJECT_LIST[0])
      await projectController.setTokenAddress(projectHash, tokenAdd)

      const result = await projectController.getTokenAddress(projectHash)
      result.should.be.equal(tokenAdd)
    })

    it('Register token addres to a non-existing project', async () => {
      const projectHash = wweb3.utils.keccak256(PROJECT_LIST[1])
      await projectController.setTokenAddress(
        projectHash,
        tokenAdd
      ).should.be.rejectedWith(Error.EVMRevert)
    })
  })
})
