import EVMRevert from 'openzeppelin-solidity/test/helpers/EVMRevert'

var Kernel = artifacts.require("./kernel/Kernel.sol");

var ACLHandler = artifacts.require("./handlers/ACLHandler.sol");
var ContractAddressHandler = artifacts.require("./handlers/ContractAddressHandler.sol");

var PLCRVoting = artifacts.require("./VTCR/PLCRVoting.sol");
var Registry = artifacts.require("./VTCR/Registry.sol");
var TestSale = artifacts.require("./VTCR/TestSale.sol");
var Parameterizer = artifacts.require("./VTCR/Parameterizer.sol");
var Token = artifacts.require("../node_modules/vetx-token/contracts/VetXToken.sol")

const fs = require('fs');

var BigNumber = web3.BigNumber
require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should()

contract('Registry', (accounts) => {
	const ROOT_ACCOUNT = accounts[0];
	const projectList = ['project #0', 'project #1', 'project #2','project #3'];
	
	let parameterizerConfig;
	let testSale;
	let registry;
	let tokenAdd;
	let parameterizer;
	let kernel;
	let token;
	let aclHandler;
	let contractAddressHandler;
	let aclHandlerCI;
	let contractAddressHandlerCI;
	before( async () => {
		const config = JSON.parse(fs.readFileSync("./config/VTCR/config.json"));
		parameterizerConfig = config.paramDefaults;

		kernel = await Kernel.new();
		aclHandler = await ACLHandler.new(kernel.address);
		contractAddressHandler = await ContractAddressHandler.new(kernel.address);
		
		testSale = await TestSale.new();
		await testSale.purchaseTokens({from: ROOT_ACCOUNT, value: config.initialTokenPurchase});
		
		tokenAdd = await testSale.getTokenAddr();
		token = await Token.at(tokenAdd);

		const plcrVoting = await PLCRVoting.new(tokenAdd)
		const parameterizer =  await Parameterizer.new(
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
		    );
		registry = await Registry.new(kernel.address, tokenAdd, plcrVoting.address, parameterizer.address);

		aclHandlerCI = await aclHandler.CI();

		contractAddressHandlerCI = await contractAddressHandler.CI();
	});

	describe("Project applications", () => {
		it("One new application", async () => {
			await token.approve(registry.address, parameterizerConfig.minDeposit);
			await registry.apply(projectList[0] , parameterizerConfig.minDeposit);
		});

		it("Two different projects", async () => {
			await token.approve(registry.address, parameterizerConfig.minDeposit);
			await registry.apply(projectList[1], parameterizerConfig.minDeposit);

			await token.approve(registry.address, parameterizerConfig.minDeposit);
			await registry.apply(projectList[2], parameterizerConfig.minDeposit);
		});

		it ("Duplicate project rejected", async () => {
			await token.approve(registry.address, parameterizerConfig.minDeposit);
			await registry.apply(
				projectList[0],
				parameterizerConfig.minDeposit
			).should.be.rejectedWith(EVMRevert);
		});
	});

	describe("Challenges", () => {
		it("A new challenge to existing application", async () =>{
			await token.approve(registry.address, parameterizerConfig.minDeposit);
			const challengeID = await registry.challenge(projectList[0]);
		});

		it("A new challenge to non-existing application", async() =>{
			await token.approve(registry.address, parameterizerConfig.minDeposit);
			const challengeID = await registry.challenge(
				projectList[3]
			).should.be.rejectedWith(EVMRevert);
		});
	});

	describe("Connect handlers to kernel", () => {
		it("Connect ACLHandler to kernel", async ()=>{
			await kernel.registerHandler(aclHandlerCI, aclHandler.address);
			await kernel.connect(aclHandler.address,[]);
		})

		it("connect ContractAddressHandler to kernel", async ()=>{
			await kernel.registerHandler(contractAddressHandlerCI, contractAddressHandler.address);
			await kernel.connect(contractAddressHandler.address, []);
		});
	});

	describe("VTCR as a Module tests: ", () =>{
		it("Connect registry to ACL and contract-address handlers ", async () =>{
			await kernel.connect(registry.address, [aclHandlerCI, contractAddressHandlerCI]);
		});

		it("Register registry in ContractAddressHandler", async () => {
			const registryCI = await registry.CI();
			await contractAddressHandler.registerContract(registryCI, registry.address);
		});
	});


});
