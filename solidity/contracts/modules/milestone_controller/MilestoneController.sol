pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "repsys/contracts/ReputationSystem.sol";

import '../Module.sol';
import './MilestoneControllerStorage.sol';
import '../project_controller/ProjectController.sol';
import "../regulating_rating/RegulatingRating.sol";
import "../token_sale/TokenSale.sol";


contract MilestoneController is Module {
    using SafeMath for uint;

    // events
    event MilestoneAdded(
        address indexed sender,
        bytes32 namespace,
        uint milestoneId,
        uint length,
        bytes32[] objs,
        bytes32[] objTypes,
        uint[] objMaxRegulationRewards
    );

    event MilestoneActivated(
        address indexed sender,
        bytes32 namespace,
        uint milestoneId,
        uint weiLocked,
        uint startTime,
        uint endTime
    );

    event RatingStageStarted(
        address indexed sender,
        bytes32 namespace,
        uint milestoneId,
        uint startTime,
        uint endTime,
        bytes32[] objs,
        bytes32[] objTypes,
        uint[] objMaxRegulationRewards
    );

    event RefundStageStarted(
        address indexed sender,
        bytes32 namespace,
        uint milestoneId,
        uint startTime,
        uint endTime
    );

    event MilestoneFinalized(
        address indexed sender,
        bytes32 namespace,
        uint milestoneId,
        uint finalizedTime,
        uint endTime
    );

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
            uint milesoneId;
            uint startTime;
            uint endTime;

            //  the amount of wei locked in the milestone
            uint weiLocked;

            MilestoneState state;

            // list of objectives' IPFS hash
            bytes32[] objs;

            // list of objectives' type
            bytes32[] objTypes;

            // list of objectives' maxReward
            uint[] objMaxRegulationRewards
        }
    */
    bytes constant START_TIME = "startTime";
    bytes constant END_TIME = "endTime";
    bytes constant WEI_LOCKED = "weiLocked";
    bytes constant STATE = "state";
    bytes constant OBJS = "objs";
    bytes constant OBJ_TYPES = "objTypes";
    bytes constant OBJ_MAX_REGULATION_REWARDS = "objMaxRegulationRewards";
    bytes constant CUMULATIVE_MAX_REGULATION_REWARDS = "CumulativeMaxRegulationRewards";
    bytes constant NUMBER_MILESTONES = "numberMilestones";
    bytes constant MILESTONE_LENGTH = "milestoneLength";
    uint constant GLOBAL_MILESTONE_ID = uint(-1);
    uint constant MAX_REGULATION_REWARD_PERCENTAGE = 10;

    address constant NULL = address(0x0);

    // CI
    bytes32 constant REPUTATION_SYSTEM_CI = keccak256("ReputationSystem");
    bytes32 constant PROJECT_CONTROLLER_CI = keccak256("ProjectController");
    bytes32 constant TOKEN_SALE_CI = keccak256("TokenSale");

    MilestoneControllerStorage public milestoneControllerStore;
    RegulatingRating public regulatingRating;
    TokenSale public tokenSale;
    ReputationSystem public reputationSystem;
    ProjectController public projectController;


    modifier founderOnly(bytes32 namespace) {
        require(projectController != NULL);
        require(projectController.verifyOwner(namespace, msg.sender));
        _;
    }

    constructor (address kernelAddr) Module(kernelAddr) public {
        CI = keccak256("MilestoneController");
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
    * @param objTypes list of objectives' type
    * @param objMaxRegulationRewards list of objectives' max regulation rewards
    */
    function addMilestone(
        bytes32 namespace,
        uint length,
        bytes32[] objs,
        bytes32[] objTypes,
        uint[] objMaxRegulationRewards
    )
        external
        founderOnly(namespace)
    {
        require(length >= 60 days);
        require(
            reputationSystem != NULL &&
            projectController != NULL &&
            tokenSale != NULL);

        uint milestoneId = verifyAddingMilestone(namespace);

        milestoneControllerStore.setUint(
            keccak256(abi.encodePacked(namespace, GLOBAL_MILESTONE_ID, NUMBER_MILESTONES)),
            milestoneId
        );

        initMilestone(
            namespace,
            milestoneId,
            length,
            objs,
            objTypes,
            objMaxRegulationRewards);

        emit MilestoneAdded(
            msg.sender,
            namespace,
            milestoneId,
            length,
            objs,
            objTypes,
            objMaxRegulationRewards
        );
    }

    /**
    * Activate a milestone
    * First check if the previous milestone can be set to state "COMPLETION" using
    *   require(finalize(namespace, milestoneId));
    * Then activate this milestone
    *
    * @param namespace namespace of a project
    * @param milestoneId milestoneId of a milestone of the project
    * @param weiLocked the amount of wei locked in the milestone
    * @param minStartTime the minimum starting time (unix timestamp)
    *     to start a poll
    * @param maxStartTime the maximum starting time (unix timestamp)
    *     to start a poll
    */
    function activate(
        bytes32 namespace,
        uint milestoneId,
        uint weiLocked,
        uint minStartTime,
        uint maxStartTime
    )
        external
        founderOnly(namespace)
    {
        require(minStartTime >= now && minStartTime < maxStartTime);
        require(milestoneId == 1 || finalize(namespace, milestoneId.sub(1)));

        milestoneControllerStore.setUint(
            keccak256(abi.encodePacked(namespace, milestoneId, STATE)),
            uint(MilestoneState.IP)
        );
        milestoneControllerStore.setUint(
            keccak256(abi.encodePacked(namespace, milestoneId, WEI_LOCKED)),
            weiLocked
        );

        (uint startTime, uint endTime) = scheduleMilestone(namespace, milestoneId);
        require(maxStartTime < endTime);

        // update cumulative max regulation rewards
        updateCumulativeMaxRegulationRewards(
            namespace,
            milestoneId);

        // call reputation system to register poll request
        registerPollRequest(
            namespace,
            milestoneId,
            minStartTime,
            maxStartTime);

        // use insideTransfer to lock weiLock.
        EtherCollector etherCollector = 
            EtherCollector(contractAddressHandler.contracts(ETHER_COLLECTOR_CI));
        bytes32 fromKey = keccak256(abi.encodePacked(namespace, PROJECT_ETHER_BALANCE));
        bytes32 toKey = keccak256(
            abi.encodePacked(namespace, milestoneId, MILESTONE_ETHER_WEILOCKED));
        etherCollector.insideTransfer(fromKey, toKey, weiLocked);

        emit MilestoneActivated(
            msg.sender,
            namespace,
            milestoneId,
            weiLocked,
            startTime,
            endTime
        );
    }

    /**
    * Start rating stage (RS)
    * RS can be started by project founders at any time between startTime and endTime - 30 days.
    * Set state to "RS",  call module
    *      RegulatingRatingModule.start(namespace, milestoneId, objs, now, endTime - 30 days);
    *
    *  @param namespace namespace of a project
    *  @param milestoneId milestoneId of a milestone of the project
    */
    function startRatingStage(bytes32 namespace, uint milestoneId)
        external
        founderOnly(namespace)
    {
        require(address(regulatingRating) != NULL);
        bool existing;
        uint endTime;
        (existing, endTime) = isExisting(namespace, milestoneId);
        require(existing);

        uint startTime = milestoneControllerStore.getUint(
            keccak256(abi.encodePacked(namespace, milestoneId, START_TIME)));
        require(now >= startTime && now <= endTime.sub(30 days));

        milestoneControllerStore.setUint(
            keccak256(
                abi.encodePacked(namespace, milestoneId, STATE)),
                uint(MilestoneState.RS));

        bytes32[] memory objs = milestoneControllerStore.getArray(
            keccak256(abi.encodePacked(namespace, milestoneId, OBJS)));
        bytes32[] memory objTypes = milestoneControllerStore.getArray(
            keccak256(abi.encodePacked(namespace, milestoneId, OBJ_TYPES)));
        uint[] memory objMaxRegulationRewards = milestoneControllerStore.getUintArray(
            keccak256(abi.encodePacked(namespace, milestoneId, OBJ_MAX_REGULATION_REWARDS)));

        regulatingRating.start(
            namespace,
            milestoneId,
            now,
            endTime.sub(30 days),
            objs,
            objTypes,
            objMaxRegulationRewards
        );

        emit RatingStageStarted(
            msg.sender,
            namespace,
            milestoneId,
            now,
            endTime.sub(30 days),
            objs,
            objTypes,
            objMaxRegulationRewards
        );
    }

    /**
    * Start a refund
    * Can be called at anytime between [endTime - 1 week, endTime) by any address
    * Set state to "RP"
    *
    * @param namespace namespace of a project
    * @param milestoneId milestoneId of a milestone of the project
    */
    function startRefundStage(bytes32 namespace, uint milestoneId) external  {
        bool existing;
        uint endTime;
        (existing, endTime) = isExisting(namespace, milestoneId);
        require(existing);
        require(now >= endTime.sub(1 weeks) && now < endTime);

        milestoneControllerStore.setUint(
            keccak256(
                abi.encodePacked(namespace, milestoneId, STATE)),
                uint(MilestoneState.RP));

        emit RefundStageStarted(
            msg.sender,
            namespace,
            milestoneId,
            now,
            endTime
        );
    }

    /**
    * Get finalizing state and regulation rewards for an objective performed by a regulator
    *
    * @param namespace namespace of a project
    * @param milestoneId milestoneId of a milestone of the project
    * @param obj an objective in a milestone of the project
    * @param _addr address of the regulator
    */
    function getRegulationRewardsForRegulator(
        bytes32 namespace,
        uint milestoneId,
        bytes32 obj,
        address _addr
    )
        external
        view
        returns (bool, uint)
    {
        (bool existing,) = isExisting(namespace, milestoneId);
        require(existing);
        (, bool finalized, ) = regulatingRating.getObjInfo(namespace, milestoneId, obj);
        uint rewards = regulatingRating.getRegulationRewardsForRegulator(
            namespace,
            milestoneId,
            obj,
            _addr);
        return (finalized, rewards);
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
    * Bind with RegulatingRating
    *
    * @param _addr the address of RegulatingRating
    */
    function setRegulatingRating(address _addr) public connected {
        regulatingRating = RegulatingRating(_addr);
    }

    /**
    * Bind with Reputation System
    *
    * @param _addr the address of Reputation System
    */
    function setReputationSystem(address _addr) public connected {
        reputationSystem = ReputationSystem(_addr);
    }

    /**
    * Bind with TokenSale
    *
    * @param _addr the address of TokenSale
    */
    function setTokenSale(address _addr) public connected {
        tokenSale = TokenSale(_addr);
    }

    /**
    * Bind with ProjectController
    *
    * @param _addr the address of ProjectController
    */
    function setProjectController(address _addr) public connected {
        projectController = ProjectController(_addr);
    }

    /**
    * Returns the current wei amount locked in the milestone.
    *
    * @param namespace namespace of a project
    * @param milestoneId milestoneId of a milestone of the project
    */
    function milestoneWeiLocked(bytes32 namespace, uint milestoneId)
        public
        view
        returns (uint)
    {
        bool existing;
        (existing, ) = isExisting(namespace, milestoneId);
        require(existing);
        return milestoneControllerStore.getUint(
            keccak256(abi.encodePacked(namespace, milestoneId, WEI_LOCKED)));
    }

    /**
    * Only admin (connected) can call this function.
    * Return true and set the milestone's state to "COMPLETION"
    *     if a milestone is finalizable (now >= milestone's endTime)
    *
    * @param namespace namespace of a project
    * @param milestoneId milestoneId of a milestone of the project
    */
    function adminFinalize(bytes32 namespace, uint milestoneId) 
        public 
        connected 
        returns (bool) 
    {
        return finalize(namespace, milestoneId);
    }

    /**
    * Only founder can call this function
    * Return true and set the milestone's state to "COMPLETION"
    *     if a milestone is finalizable (now >= milestone's endTime)
    *
    * @param namespace namespace of a project
    * @param milestoneId milestoneId of a milestone of the project
    */
    function founderFinalize(bytes32 namespace, uint milestoneId) 
        public 
        founderOnly(namespace)
        returns (bool) 
    {
        uint numberMilestones = milestoneControllerStore.getUint(
            keccak256(abi.encodePacked(namespace, GLOBAL_MILESTONE_ID, NUMBER_MILESTONES)));
        require (numberMilestones ==  milestoneId);
        return finalize(namespace, milestoneId);
    }

    /**
    * Return true and set the milestone's state to "COMPLETION"
    *     if a milestone is finalizable (now >= milestone's endTime)
    *
    * @param namespace namespace of a project
    * @param milestoneId milestoneId of a milestone of the project
    */
    function finalize(bytes32 namespace, uint milestoneId) internal returns (bool) {
        bool existing;
        uint endTime;
        (existing, endTime) = isExisting(namespace, milestoneId);
        require(existing);

        uint currentState = milestoneControllerStore.getUint(
            keccak256(abi.encodePacked(namespace, milestoneId, STATE)));

        if (currentState == uint(MilestoneState.COMPLETION)) {
            return true;
        }

        if (now >= endTime) {
            milestoneControllerStore.setUint(
                keccak256(abi.encodePacked(namespace, milestoneId, STATE)),
                uint(MilestoneState.COMPLETION));

            emit MilestoneFinalized(
                msg.sender,
                namespace,
                milestoneId,
                now,
                endTime
            );

            return true;
        }
        return false;
    }

    /**
    * Get the length of given milestone
    *
    * @param namespace namespace of a project
    * @param milestoneId the milestone id of a project
    * @return the length of the given milestone
    */
    function getMilestoneLength(bytes32 namespace, uint milestoneId)
        public
        view
        returns (uint)
    {
        // receive length
        return milestoneControllerStore.getUint(
            keccak256(abi.encodePacked(
                namespace,
                milestoneId,
                MILESTONE_LENGTH)));
    }

    /**
    * Return true and the endTime if the milestone exists
    *
    * @param namespace namespace of a project
    * @param milestoneId milestoneId of a milestone of the project
    */
    function isExisting(bytes32 namespace, uint milestoneId)
        public
        view
        returns (bool, uint)
    {
        uint endTime = milestoneControllerStore.getUint(
            keccak256(abi.encodePacked(namespace, milestoneId, END_TIME)));
        return endTime != 0 ? (true, endTime) : (false, 0);
    }

    /**
    * Returns the current state, convert enum to uint
    *
    * @param namespace namespace of a project
    * @param milestoneId milestoneId of a milestone of the project
    */
    function milestoneState(bytes32 namespace, uint milestoneId)
        public
        view
        returns (uint)
    {
        bool existing;
        (existing, ) = isExisting(namespace, milestoneId);
        require(existing);
        return milestoneControllerStore.getUint(
            keccak256(abi.encodePacked(namespace, milestoneId, STATE)));
    }

    /**
    * Initialize a milestone
    *
    * @param namespace namespace of a project
    * @param milestoneId id of the milestone
    * @param length  length(period) of the milestone
    * @param objs list of objectives' IPFS hash
    * @param objTypes list of objectives' type
    * @param objMaxRegulationRewards list of objectives' max regulation rewards
    */
    function initMilestone(
        bytes32 namespace,
        uint milestoneId,
        uint length,
        bytes32[] objs,
        bytes32[] objTypes,
        uint[] objMaxRegulationRewards
    )
      internal
    {
        milestoneControllerStore.setUint(
            keccak256(abi.encodePacked(namespace, milestoneId, MILESTONE_LENGTH)),
            length
        );
        milestoneControllerStore.setUint(
            keccak256(abi.encodePacked(namespace, milestoneId, STATE)),
            uint(MilestoneState.INACTIVE)
        );
        milestoneControllerStore.setArray(
            keccak256(abi.encodePacked(namespace, milestoneId, OBJS)),
            objs
        );
        milestoneControllerStore.setArray(
            keccak256(abi.encodePacked(namespace, milestoneId, OBJ_TYPES)),
            objTypes
        );
        milestoneControllerStore.setUintArray(
            keccak256(abi.encodePacked(namespace, milestoneId, OBJ_MAX_REGULATION_REWARDS)),
            objMaxRegulationRewards
        );

        /*
        * Calculator and store total max regulation rewards
        */
        // calculator the total max rewards
        uint totalMaxRewards = 0;
        for (uint i = 0; i < objMaxRegulationRewards.length; i++) {
            totalMaxRewards = totalMaxRewards.add(objMaxRegulationRewards[i]);
        }
        require(totalMaxRewards != 0);
        // store the total max rewards
        uint projectTotalRewards = milestoneControllerStore.getUint(
            keccak256(abi.encodePacked(namespace, PROJECT_TOTAL_REGULATOR_REWARDS)));
        projectTotalRewards = projectTotalRewards.add(totalMaxRewards);
        milestoneControllerStore.setUint(
            keccak256(abi.encodePacked(namespace, PROJECT_TOTAL_REGULATOR_REWARDS)),
            projectTotalRewards
        );
    }

    /**
    * Get the project total regulator rewards
    *
    * @param namespace namespace of a project
    * @return the project total regulator rewards
    */
    function getProjectTotalRegulatorRewards(bytes32 namespace) public view returns(uint) {
        return milestoneControllerStore.getUint(
            keccak256(abi.encodePacked(namespace, PROJECT_TOTAL_REGULATOR_REWARDS)));
    }



    /**
    * Verify whether a milestone can be be added. Return the assigned milestone id and
    *   the last end time if it is Qualified
    * Note: the first milestone is INACTIVE or there is no milestones
    *
    * @param namespace namespace of a project
    */
    function verifyAddingMilestone(bytes32 namespace) internal view returns (uint) {
        uint numberMilestones = milestoneControllerStore.getUint(
            keccak256(abi.encodePacked(namespace, GLOBAL_MILESTONE_ID, NUMBER_MILESTONES)));

        // first milestone state is INACTIVE if no milestone exist.
        uint firstMilestoneState = uint(MilestoneState.INACTIVE);
        if (numberMilestones > 0) {
            // get state for the first milestone (first milestone id should be 1)
            firstMilestoneState = milestoneControllerStore.getUint(
                keccak256(abi.encodePacked(namespace, uint(1), STATE)));
        }
        require(numberMilestones == 0 || firstMilestoneState == uint(MilestoneState.INACTIVE));

        uint milestoneId = numberMilestones + 1;
        bool existing;
        (existing,) = isExisting(namespace, milestoneId);
        require(!existing);
        return milestoneId;
    }

    /**
    * Calculate the current cumulativeMaxRewards
    *
    * @param namespace namespace of a project
    * @param objMaxRegulationRewards list of objectives' max regulation rewards
    */
    function calCumulativeMaxRewards(
        bytes32 namespace,
        uint[] objMaxRegulationRewards
    )
        internal
        view
        returns (uint)
    {
        uint cumulativeMaxRewards = milestoneControllerStore.getUint(
            keccak256(abi.encodePacked(namespace, GLOBAL_MILESTONE_ID, CUMULATIVE_MAX_REGULATION_REWARDS)));
        uint sum;
        for (uint i = 0; i < objMaxRegulationRewards.length; i++) {
            sum.add(objMaxRegulationRewards[i]);
        }
        require(address(tokenSale) != NULL);
        ( , , uint totalEth, ) = tokenSale.tokenInfo(namespace);
        require(
            cumulativeMaxRewards.add(sum) <=
            totalEth.mul(MAX_REGULATION_REWARD_PERCENTAGE).div(100));
        cumulativeMaxRewards = cumulativeMaxRewards.add(sum);
        return cumulativeMaxRewards;
    }


    /**
    * The function to update Cumulative max regulation rewards
    *
    * @param namespace namespace of a project
    * @param milestoneId the id for this milestone
    */
    function updateCumulativeMaxRegulationRewards(
        bytes32 namespace,
        uint256 milestoneId
    )
        private
    {
        uint256[] memory objMaxRegulationRewards =
            milestoneControllerStore.getUintArray(
                keccak256(abi.encodePacked(namespace, milestoneId, OBJ_MAX_REGULATION_REWARDS)));

        milestoneControllerStore.setUint(
            keccak256(abi.encodePacked(namespace, GLOBAL_MILESTONE_ID, CUMULATIVE_MAX_REGULATION_REWARDS)),
            calCumulativeMaxRewards(namespace, objMaxRegulationRewards)
        );
    }

    /**
    * Call reputation system function to register poll request
    *
    * @param namespace namespace of a project
    * @param milestoneId the id for this milestone
    * @param minStartTime the minimum starting time (unix timestamp)
    *     to start a poll (by calling carbon.register())
    * @param maxStartTime the maximum starting time (unix timestamp)
    *     to start a poll
    */
    function registerPollRequest(
        bytes32 namespace,
        uint256 milestoneId,
        uint minStartTime,
        uint maxStartTime
    )
        private
    {
        bytes32[] memory objTypes = milestoneControllerStore.getArray(
            keccak256(abi.encodePacked(namespace, milestoneId, OBJ_TYPES)));
        address tokenAddress = projectController.getTokenAddress(namespace);
        uint avgPrice = tokenSale.avgPrice(namespace);

        reputationSystem.registerPollRequest(
            keccak256(abi.encodePacked(namespace, milestoneId)),
            minStartTime,
            maxStartTime,
            avgPrice,
            true,
            tokenAddress,
            objTypes
        );
    }

    /**
    * Schedule milestone's start time and end time
    * Calculate startTime, endTime and store them
    *
    * @param namespace namespace of a project
    * @param milestoneId the id for this milestone
    */
    function scheduleMilestone(bytes32 namespace, uint milestoneId)
        internal
        returns (uint, uint)
    {
        uint startTime;
        // if activate first milestone (milestondId == 1)
        if (milestoneId == 1) {
            uint state = projectController.getProjectState(namespace);
            // require refund stage 
            require(state == uint(ProjectController.ProjectState.TokenSale));
            (,,,bool finalized) = tokenSale.tokenInfo(namespace);
            // require refund finalized
            require(finalized);
            // set stage to milestone
            projectController.setState(
                namespace, 
                uint(ProjectController.ProjectState.Milestone));

            startTime = now;
        } else {
            (bool existing, uint lastEndTime) = isExisting(namespace, milestoneId.sub(1));
            startTime = lastEndTime;
            require(existing);
        }
        uint length = getMilestoneLength(namespace, milestoneId);
        uint endTime = startTime.add(length);

        milestoneControllerStore.setUint(
            keccak256(abi.encodePacked(namespace, milestoneId, START_TIME)),
            startTime
        );
        milestoneControllerStore.setUint(
            keccak256(abi.encodePacked(namespace, milestoneId, END_TIME)),
            endTime
        );

        return (startTime, endTime);
    }
}
