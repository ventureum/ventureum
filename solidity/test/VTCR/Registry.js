import EVMRevert from 'openzeppelin-solidity/test/helpers/EVMRevert'

const fs = require('fs')
const Web3 = require('web3')
const BigNumber = web3.BigNumber
require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should()

const Kernel = artifacts.require('./kernel/Kernel.sol')

const ACLHandler = artifacts.require('./handlers/ACLHandler.sol')
const ContractAddressHandler = artifacts.require('./handlers/ContractAddressHandler.sol')

const PLCRVoting = artifacts.require('./VTCR/PLCRVoting.sol')
const Registry = artifacts.require('./VTCR/Registry.sol')
const TestSale = artifacts.require('./VTCR/TestSale.sol')
const Parameterizer = artifacts.require('./VTCR/Parameterizer.sol')
const Token = artifacts.require('../node_modules/vetx-token/contracts/VetXToken.sol')
const ProjectController = artifacts.require('./project_controller/ProjectController.sol')
const ProjectControllerStorage = artifacts.require(
  './project_controller/ProjectControllerStorage.sol')

const wweb3 = new Web3()

const PROJECT_LIST = ['project #0', 'project #1', 'project #2', 'project #3']

// ProjectController function sig
const REGISTER_PROJECT_SIG = wweb3.eth.abi.encodeFunctionSignature(
  'registerProject(bytes32,address,address)')
const UNREGISTER_PROJECT_SIG = wweb3.eth.abi.encodeFunctionSignature(
  'unregisterProject(bytes32)')
const SET_STATE_SIG = wweb3.eth.abi.encodeFunctionSignature('setState(bytes32,uint256)')
const SET_STORAGE_SIG = wweb3.eth.abi.encodeFunctionSignature('setStorage(address)')
const SET_TOKEN_ADDRESS_SIG = wweb3.eth.abi.encodeFunctionSignature(
  'setTokenAddress(bytes32,address)')

// ProjectControllerStorage function sig
const SET_UINT_SIG = wweb3.eth.abi.encodeFunctionSignature('setUint(bytes32,uint256)')
const SET_ADDRESS_SIG = wweb3.eth.abi.encodeFunctionSignature('setAddress(bytes32,address)')
const SET_BYTES32_SIG = wweb3.eth.abi.encodeFunctionSignature('setBytes32(bytes32,bytes32)')

const ROOT_CI = wweb3.utils.keccak256('root')

contract('Registry', (accounts) => {
  const ROOT_ACCOUNT = accounts[0]

  let parameterizerConfig
  let testSale
  let registry
  let tokenAdd
  let kernel
  let token
  let aclHandler
  let contractAddressHandler
  let aclHandlerCI
  let contractAddressHandlerCI
  let projectController
  let projectControllerStorage

  before(async () => {
    const config = JSON.parse(fs.readFileSync('./config/VTCR/config.json'))
    parameterizerConfig = config.paramDefaults

    kernel = await Kernel.new()

    aclHandler = await ACLHandler.new(kernel.address)
    contractAddressHandler = await ContractAddressHandler.new(kernel.address)

    testSale = await TestSale.new()
    await testSale.purchaseTokens({from: ROOT_ACCOUNT, value: config.initialTokenPurchase})

    tokenAdd = await testSale.getTokenAddr()
    token = await Token.at(tokenAdd)

    const plcrVoting = await PLCRVoting.new(tokenAdd)
    const parameterizer = await Parameterizer.new(
      plcrVoting.address,
      tokenAdd,
      parameterizerConfig.minDeposit,
      parameterizerConfig.pMinDeposit,
      parameterizerConfig.applyStageLength,
      parameterizerConfig.pApplyStageLength,
      parameterizerConfig.commitStageLength,
      parameterizerConfig.pCommitStageLength,
      parameterizerConfig.revealStageLength,
      parameterizerConfig.pRevealStageLength,
      parameterizerConfig.dispensationPct,
      parameterizerConfig.pDispensationPct,
      parameterizerConfig.voteQuorum,
      parameterizerConfig.pVoteQuorum
    )

    projectController = await ProjectController.new(kernel.address)
    projectControllerStorage = await ProjectControllerStorage.new(kernel.address)

    registry = await Registry.new(
      kernel.address,
      tokenAdd,
      plcrVoting.address,
      parameterizer.address,
      projectController.address
    )

    aclHandlerCI = await aclHandler.CI()
    contractAddressHandlerCI = await contractAddressHandler.CI()

    // Connect ACLHandler to kernel
    await kernel.registerHandler(aclHandlerCI, aclHandler.address)
    await kernel.connect(aclHandler.address, [])

    // Connect ContractAddressHandler to kernel
    await kernel.registerHandler(
      contractAddressHandlerCI,
      contractAddressHandler.address
    )
    await kernel.connect(contractAddressHandler.address, [])

    // Connect ProjectController and storage to ACL and contract-address handlers
    await kernel.connect(
      projectController.address,
      [aclHandlerCI, contractAddressHandlerCI]
    )
    await kernel.connect(
      projectControllerStorage.address,
      [aclHandlerCI, contractAddressHandlerCI]
    )

    // Register contracts in ContractAddressHandler
    const projectControllerCI = await projectController.CI()
    const projectControllerStorageCI = await projectControllerStorage.CI()
    await contractAddressHandler.registerContract(
      projectControllerCI,
      projectController.address
    )
    await contractAddressHandler.registerContract(
      projectControllerStorageCI,
      projectControllerStorage.address
    )
    await contractAddressHandler.registerContract(ROOT_CI, ROOT_ACCOUNT)

    // Authorize root to call setStorage
    await aclHandler.permit(ROOT_CI, projectControllerCI, SET_STORAGE_SIG)

    // Authorize root to call setTokenAddress in ProjectController
    await aclHandler.permit(ROOT_CI, projectControllerCI, SET_TOKEN_ADDRESS_SIG)

    // Set storage for projectController
    await projectController.setStorage(projectControllerStorage.address)

    // Authorize ProjectController to access ProjectControllerStorageCI
    await aclHandler.permit(
      projectControllerCI,
      projectControllerStorageCI,
      SET_UINT_SIG
    )
    await aclHandler.permit(
      projectControllerCI,
      projectControllerStorageCI,
      SET_ADDRESS_SIG
    )
    await aclHandler.permit(
      projectControllerCI,
      projectControllerStorageCI,
      SET_BYTES32_SIG
    )
  })

  describe('VTCR as a Module tests: ', () => {
    it('Connect registry to ACL and contract-address handlers ', async () => {
      await kernel.connect(registry.address, [aclHandlerCI, contractAddressHandlerCI])
    })

    it('Register registry in ContractAddressHandler', async () => {
      const registryCI = await registry.CI()
      await contractAddressHandler.registerContract(registryCI, registry.address)
    })

    it('Allow Regisry call registerProject in ProjectController', async () => {
      const registryCI = await registry.CI()
      const projectControllerCI = await projectController.CI()

      aclHandler.permit(registryCI, projectControllerCI, REGISTER_PROJECT_SIG)
    })

    it('Allow Regisry call removeProject in ProjectController', async () => {
      const registryCI = await registry.CI()
      const projectControllerCI = await projectController.CI()

      aclHandler.permit(registryCI, projectControllerCI, UNREGISTER_PROJECT_SIG)
    })

    it('Allow Regisry call setState in ProjectController', async () => {
      const registryCI = await registry.CI()
      const projectControllerCI = await projectController.CI()

      aclHandler.permit(registryCI, projectControllerCI, SET_STATE_SIG)
    })
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
      ).should.be.rejectedWith(EVMRevert)
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
      ).should.be.rejectedWith(EVMRevert)
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
      ).should.be.rejectedWith(EVMRevert)
    })
  })
})
