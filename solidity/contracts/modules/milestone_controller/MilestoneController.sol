pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "repsys/contracts/ReputationSystem.sol";

import '../Module.sol';
import './MilestoneControllerStorage.sol';
import '../project_controller/ProjectController.sol';
import '../token_sale/TokenSale.sol';


contract MilestoneController is Module {

    using SafeMath for uint;

    // Can only add state in order
    // Do not delete or rearrange states
    // If you want to depreciate a state, add comment
    enum MilestoneState {
        INACTIVE,
        IP, // In progress
        RS, // Rating stage , regulators rate for each objective
        RP, // Refund Period
        COMPLETION   // Completion
    }

    /*
        Fields Names for struct MilestoneData

        struct MilestoneData {
            uint id;
            uint startTime;
            uint endTime;

            //  the amount of wei locked in the milestone
            uint weiLocked;

            MilestoneState state;

            // list of objectives' IPFS hash
            bytes32[] objs;
        }
    */
    string constant ID = "id";
    string constant START_TIME = "startTime";
    string constant END_TIME = "endTime";
    string constant WEI_LOCKED = "weiLocked";
    string constant STATE = "state";
    string constant OBJS = "objs";
    string constant NUMBER_MILESTONES = "numberMilestones";

    address constant NULL = address(0x0);

    bytes32[] public mockContextTypes;

    // CI
    bytes32 constant REPUTATION_SYSTEM_CI = keccak256("ReputationSystem");
    bytes32 constant PROJECT_CONTROLLER_CI = keccak256("ProjectController");
    bytes32 constant TOKEN_SALE_CI = keccak256("TokenSale");

    MilestoneControllerStorage public milestoneControllerStore;

    ReputationSystem public reputationSystem;
    ProjectController public projectController;
    TokenSale public tokenSale;

    constructor (address kernelAddr) Module(kernelAddr) public {
        CI = keccak256("MilestoneController");
    }

    function setReputationSystem (address reputationSystemAddress) external {
        reputationSystem = ReputationSystem(reputationSystemAddress);
    }

    function setProjectController (address projectControllerAddress) external {
        projectController = ProjectController(projectControllerAddress);
    }

    function setTokenSale (address tokenSaleAddress) external {
        tokenSale = TokenSale(tokenSaleAddress);
    }

    /**
    * Add a milestone
    * Can only be called if the first milestone is INACTIVE or there is no milestones
    * If it is the first milestone to be added, set state to "INACTIVE" and endTime to
    * now + length.
    *
    * @param namespace namespace of a project
    * @param length length of the milestone, >= 60 days
    * @param objs list of objectives' IPFS hash
    */
    function addMilestone(bytes32 namespace, uint length, bytes32[] objs) external {
        require(length >= 60 days);
        require(
            reputationSystem != NULL && 
            projectController != NULL && 
            tokenSale != NULL);

        uint numberMilestones = milestoneControllerStore.getUint(
            keccak256(abi.encodePacked(namespace, NUMBER_MILESTONES)));

        uint firstMilestoneState;
        if (numberMilestones > 0) {
            // get state for the first milestone
            firstMilestoneState = milestoneControllerStore.getUint(
                keccak256(abi.encodePacked(namespace, uint(0), STATE)));
        }
        require(numberMilestones == 0 || firstMilestoneState == uint(MilestoneState.INACTIVE));

        uint lastEndTime = numberMilestones == 0 ? now :
            milestoneControllerStore.getUint(
                keccak256(abi.encodePacked(namespace, numberMilestones.sub(1), END_TIME)));

        uint id = numberMilestones;
        bool existing;
        (existing,) = isExisting(namespace, id);
        require(!existing);

        milestoneControllerStore.setUint(
            keccak256(abi.encodePacked(namespace, id, ID)), id);
        milestoneControllerStore.setUint(
            keccak256(abi.encodePacked(namespace, id, START_TIME)), lastEndTime);
        milestoneControllerStore.setUint(
            keccak256(abi.encodePacked(namespace, id, END_TIME)), lastEndTime.add(length));
        milestoneControllerStore.setUint(
            keccak256(abi.encodePacked(namespace, id, STATE)), uint(MilestoneState.INACTIVE));
        milestoneControllerStore.setArray(
            keccak256(abi.encodePacked(namespace, id, OBJS)), objs);

        address tokenAddress = projectController.getTokenAddress(namespace);

        uint avgPrice = tokenSale.avgPrice(namespace);

        reputationSystem.registerPollRequest(
            keccak256(abi.encodePacked(namespace, NUMBER_MILESTONES)),
            lastEndTime,
            lastEndTime.add(length),
            avgPrice,
            true,
            tokenAddress,
            mockContextTypes);
    }

    /**
    * Activate a milestone
    * First check if the previous milestone can be set to state "COMPLETION" using
    *   require(finalize(namespace, id));
    * Then activate this milestone
    *
    * @param namespace namespace of a project
    * @param id id of a milestone of the project
    * @param weiLocked the amount of wei locked in the milestone
    */
    function activate(bytes32 namespace, uint id, uint weiLocked) external {
        bool existing;
        uint endTime;
        (existing, endTime) = isExisting(namespace, id);
        require(existing);
        require(id == 0 || finalize(namespace, id.sub(1)));

        milestoneControllerStore.setUint(
            keccak256(abi.encodePacked(namespace, id, STATE)), uint(MilestoneState.IP));
        milestoneControllerStore.setUint(
            keccak256(abi.encodePacked(namespace, id, WEI_LOCKED)), weiLocked);
    }

    /**
    * Start rating stage (RS)
    * RS can be started by project founders at any time between startTime and endTime - 30 days.
    * Set state to "RS",  call module
    *      RegulatingRatingModule.start(namespace, id, objs, now, endTime - 30 days);
    *
    *  #TODO(david.shao):  add founderOnly modifier
    *  @param namespace namespace of a project
    *  @param id id of a milestone of the project
    */
    function startRatingStage(bytes32 namespace, uint id) external {
        bool existing;
        uint endTime;
        (existing, endTime) = isExisting(namespace, id);
        require(existing);

        uint startTime = milestoneControllerStore.getUint(
            keccak256(abi.encodePacked(namespace, id, START_TIME)));
        require(now >= startTime && now <= endTime.sub(30 days));

        milestoneControllerStore.setUint(
            keccak256(abi.encodePacked(namespace, id, STATE)), uint(MilestoneState.RS));

        // TODO(david.shao): add the following code after RegulatingRatingModule is added
        //      regulatingRatingModule.start(namespace, id, objs, now, endTime.sub(30 days))
    }

    /**
    * Start a refund
    * Can be called at anytime between [endTime - 1 week, endTime) by any address
    * Set state to "RP"
    *
    * @param namespace namespace of a project
    * @param id id of a milestone of the project
    */
    function startRefundStage(bytes32 namespace, uint id) external {
        bool existing;
        uint endTime;
        (existing, endTime) = isExisting(namespace, id);
        require(existing);
        require(now >= endTime.sub(1 weeks) && now < endTime);

        milestoneControllerStore.setUint(
            keccak256(abi.encodePacked(namespace, id, STATE)), uint(MilestoneState.RP));
    }

    /**
    * Returns the current wei amount locked in the milestone.
    *
    * @param namespace namespace of a project
    * @param id id of a milestone of the project
    */
    function milestoneWeiLocked(bytes32 namespace, uint id) external view returns (uint) {
        bool existing;
        (existing, ) = isExisting(namespace, id);
        require(existing);
        return milestoneControllerStore.getUint(
            keccak256(abi.encodePacked(namespace, id, WEI_LOCKED)));
    }

    /**
    * Returns the current state, convert enum to uint
    *
    * @param namespace namespace of a project
    * @param id id of a milestone of the project
    */
    function milestoneState(bytes32 namespace, uint id) public view returns (uint) {
        bool existing;
        (existing, ) = isExisting(namespace, id);
        require(existing);
        return milestoneControllerStore.getUint(
            keccak256(abi.encodePacked(namespace, id, STATE)));
    }

    /**
    * Bind with a storage contract
    * Create a new storage contract if _store == 0x0
    *
    * @param store the address of a storage contract
    */
    function setStorage(address store) public connected {
        super.setStorage(store);
        milestoneControllerStore = MilestoneControllerStorage(storeAddr);
    }

    /**
    * Return true and set the milestone's state to "COMPLETION"
    *     if a milestone is finalizable (now >= milestone's endTime)
    *
    * @param namespace namespace of a project
    * @param id id of a milestone of the project
    */
    function finalize(bytes32 namespace, uint id) internal returns (bool) {
        bool existing;
        uint endTime;
        (existing, endTime) = isExisting(namespace, id);
        require(existing);
        if (now >= endTime) {
            milestoneControllerStore.setUint(
                keccak256(abi.encodePacked(namespace, id, STATE)),
                uint(MilestoneState.COMPLETION));
            return true;
        }
        return false;
    }

    /**
    * Return true and the endTime if the milestone exists
    *
    * @param namespace namespace of a project
    * @param id id of a milestone of the project
    */
    function isExisting(bytes32 namespace, uint id) internal view returns (bool, uint) {
        uint endTime = milestoneControllerStore.getUint(
            keccak256(abi.encodePacked(namespace, id, END_TIME)));
        return endTime != 0 ? (true, endTime) : (false, 0);
    }
}
