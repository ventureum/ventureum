pragma solidity ^0.4.24;

//import "../IModule.sol";
import "@ventureum/kingston/contracts/modules/IModule.sol";
import "../Module.sol";
import "../project_controller/ProjectController.sol";
import "../milestone_controller/MilestoneController.sol";
import "../ether_collector/EtherCollector.sol";
import "../token_collector/TokenCollector.sol";
import "../token_sale/TokenSale.sol";


contract Manager is IModule, Module {
    ProjectController public projectController;
    MilestoneController public milestoneController;
    TokenSale public tokenSale;
    TokenCollector public tokenCollector;
    EtherCollector public etherCollector;

    modifier founderOnly(bytes32 namespace) {
        require(address(projectController) != address(0x0));
        require(projectController.verifyOwner(namespace, msg.sender));
        _;
    }

    constructor (address kernelAddr) Module(kernelAddr) public {}

    function setController(bytes32 CI, address controllerAddr)
        public
        handlerOnly(CONTRACT_ADDRESS_HANDLER_CI)
    {
        if (CI == PROJECT_CONTROLLER_CI) {
            projectController = ProjectController(controllerAddr);
        }

        if (CI == MILESTONE_CONTROLLER_CI) {
            milestoneController = MilestoneController(controllerAddr);
        }

        if (CI == TOKEN_SALE_CI) {
            tokenSale = TokenSale(controllerAddr);
        }

        if (CI == TOKEN_COLLECTOR_CI) {
            tokenCollector = TokenCollector(controllerAddr);
        }

        if (CI == ETHER_COLLECTOR_CI) {
            etherCollector = EtherCollector(controllerAddr);
        }
    }

    /**
    * Bind with a storage contract
    *
    * @param store the address of a storage contract
    */
    function setStorage(address store) public connected {
        super.setStorage(store);
    }
}

