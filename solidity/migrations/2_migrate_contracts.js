const SafeMath = artifacts.require("./SafeMath.sol");

const Kernel = artifacts.require("./kernel/Kernel.sol");
const Base = artifacts.require("./base/Base.sol");
const Handler = artifacts.require("./handlers/Handler.sol");

// handlers
const ACLHandler = artifacts.require("./handlers/ACLHandler.sol");
const ContractAddressHandler = artifacts.require(
    "./handlers/ContractAddressHandler.sol");

// modules
const Module = artifacts.require("./modules/Module.sol");
const Storage = artifacts.require("./modules/storage/Storage.sol");
const Manager = artifacts.require("./modules/managers/Manager.sol");

const EtherCollector = artifacts.require(
    "./modules/collector/EtherCollector.sol");
const EtherCollectorStorage = artifacts.require(
    "./modules/collector/EtherCollectorStorage.sol");

const ProjectController = artifacts.require(
    "./modules/project_controller/ProjectController.sol");
const ProjectControllerStorage = artifacts.require(
    "./modules/project_controller/ProjectControllerStorage.sol");

const UNIT_DEPLOY_ADDRESS = "0xa0";

module.exports = function(deployer) {
    function unitDeploy() {
        deployer.deploy(SafeMath);
        deployer.link(SafeMath, EtherCollector);

        deployer.deploy(Kernel);
        deployer.deploy(Base, UNIT_DEPLOY_ADDRESS);

        deployer.deploy(Handler, UNIT_DEPLOY_ADDRESS);
        deployer.deploy(ACLHandler, UNIT_DEPLOY_ADDRESS);
        deployer.deploy(ContractAddressHandler, UNIT_DEPLOY_ADDRESS);

        deployer.deploy(Module, UNIT_DEPLOY_ADDRESS);
        deployer.deploy(Storage, UNIT_DEPLOY_ADDRESS);
        deployer.deploy(Manager, UNIT_DEPLOY_ADDRESS);

        deployer.deploy(EtherCollector, UNIT_DEPLOY_ADDRESS);
        deployer.deploy(EtherCollectorStorage, UNIT_DEPLOY_ADDRESS);

        deployer.deploy(ProjectController, UNIT_DEPLOY_ADDRESS);
        deployer.deploy(ProjectControllerStorage, UNIT_DEPLOY_ADDRESS);
    }
    unitDeploy();
};
