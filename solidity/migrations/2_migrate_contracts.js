var SafeMath = artifacts.require("./SafeMath.sol");
var Base = artifacts.require("./kernel/Base.sol");
var Kernel = artifacts.require("./kernel/Kernel.sol");
var Module = artifacts.require("./kernel/Module.sol");
var EtherCollector = artifacts.require("./collector/EtherCollector.sol");
var EtherCollectorStorage = artifacts.require("./collector/EtherCollectorStorage.sol");
var Handler = artifacts.require("./handlers/Handler.sol");
var ACLHandler = artifacts.require("./handlers/ACLHandler.sol");
var ContractAddressHandler = artifacts.require("./handlers/ContractAddressHandler.sol");
var ProjectControllerModule = artifacts.require("./projectController/ProjectControllerModule.sol");

module.exports = function(deployer) {
    deployer.deploy(SafeMath);
    deployer.link(SafeMath, EtherCollector);
    deployer.deploy(Kernel);
    deployer.deploy(Base,"0xa0");
    deployer.deploy(Module, "0xa0");
    deployer.deploy(EtherCollector, "0xa0");
    deployer.deploy(EtherCollectorStorage, "0xa0");
    deployer.deploy(Handler, "0xa0");
    deployer.deploy(ACLHandler, "0xa0");
    deployer.deploy(ContractAddressHandler, "0xa0");
    deployer.deploy(ProjectControllerModule, "0xa0");
};
