var DLL = artifacts.require("./VTCR/DLL.sol");
var DLLBytes32 = artifacts.require("./VTCR/DLLBytes32.sol");
var Challenge = artifacts.require("./VTCR/Challenge.sol");
var AttributeStore = artifacts.require("./VTCR/AttributeStore.sol");
var SafeMath = artifacts.require("../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol");
var PLCRVoting = artifacts.require("./VTCR/PLCRVoting.sol");
var Registry = artifacts.require("./VTCR/Registry.sol");
var Parameterizer = artifacts.require("./VTCR/Parameterizer.sol");


module.exports = (deployer) =>{
  deployer.deploy(SafeMath);
  deployer.deploy(DLL);
  deployer.deploy(DLLBytes32);
  deployer.deploy(AttributeStore);
  deployer.deploy(Challenge);

	deployer.link(SafeMath, PLCRVoting);
	deployer.link(DLL, PLCRVoting);
	deployer.link(AttributeStore, PLCRVoting);
	
	deployer.link(SafeMath, Parameterizer);
	deployer.link(DLL, Parameterizer);
	deployer.link(AttributeStore, Parameterizer);
	deployer.link(Challenge, Parameterizer);
		
	deployer.link(SafeMath, Registry);
	deployer.link(DLL, Registry);
	deployer.link(DLLBytes32, Registry);
	deployer.link(AttributeStore, Registry);
	deployer.link(Challenge, Registry);
};