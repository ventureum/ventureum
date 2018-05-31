var SafeMath = artifacts.require("./SafeMath.sol");

var Kernel = artifacts.require("./kernel/Kernel.sol");
var Base = artifacts.require("./kernel/Base.sol");
var Module = artifacts.require("./kernel/Module.sol");

var Handler = artifacts.require("./handlers/Handler.sol");
var ACLHandler = artifacts.require("./handlers/ACLHandler.sol");
var ContractAddressHandler = artifacts.require("./handlers/ContractAddressHandler.sol");

var EtherCollector = artifacts.require("./collector/EtherCollector.sol");
var EtherCollectorStorage = artifacts.require("./collector/EtherCollectorStorage.sol");
var ProjectControllerModule = artifacts.require("./projectController/ProjectControllerModule.sol");

const UNIT_DEPLOY_ADDRESS = "0xa0";

module.exports = function(deployer) {
    function unitDeploy() {
        deployer.deploy(SafeMath);
        deployer.link(SafeMath, EtherCollector);

        deployer.deploy(Kernel);
        deployer.deploy(Base, UNIT_DEPLOY_ADDRESS);
        deployer.deploy(Module, UNIT_DEPLOY_ADDRESS);

        deployer.deploy(Handler, UNIT_DEPLOY_ADDRESS);
        deployer.deploy(ACLHandler, UNIT_DEPLOY_ADDRESS);
        deployer.deploy(ContractAddressHandler, UNIT_DEPLOY_ADDRESS);

        deployer.deploy(EtherCollector, UNIT_DEPLOY_ADDRESS);
        deployer.deploy(EtherCollectorStorage, UNIT_DEPLOY_ADDRESS);
        deployer.deploy(ProjectControllerModule, UNIT_DEPLOY_ADDRESS);
    }
    unitDeploy();
};
