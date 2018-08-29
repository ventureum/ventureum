pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "repsys/contracts/ReputationSystem.sol";

import "./RegulatingRatingStorage.sol";
import "./RegulatingRatingView.sol";
import "./RegulatingRatingConstants.sol";
import "../Module.sol";
import "../project_controller/ProjectController.sol";
import "../milestone_controller/MilestoneController.sol";
import "../milestone_controller/MilestoneControllerView.sol";


contract RegulatingRating is Module, RegulatingRatingConstants {
    using SafeMath for uint;

    // events
    event RegulatingRatingStarted(
        address indexed sender,
        bytes32 namespace,
        uint milestoneId,
        uint startTime,
        uint endTime,
        bytes32[] objs,
        bytes32[] objTypes,
        uint[] objMaxRegulationRewards
    );

    event RegulatorVote(
        bytes32 indexed namespace, 
        uint indexed milestoneId, 
        uint objId, 
        address regulator, 
        uint score
    );

    event AllBidsFinalized(
        address indexed sender,
        bytes32 namespace,
        uint milestoneId
    );

    event BidForObjFinalized(
        address indexed sender,
        bytes32 namespace,
        uint milestoneId,
        bytes32 obj,
        uint objId
    );

    event BidForObjIdFinalized(
        address indexed sender,
        bytes32 namespace,
        uint milestoneId,
        uint objId,
        address[] regulatorAddressList
    );

    event BidByRegulator(
        address indexed sender,
        bytes32 namespace,
        uint milestoneId,
        bytes32 obj,
        uint objId
    );

    event BackOutFromBidByRegulator(
        address indexed sender,
        bytes32 namespace,
        uint milestoneId,
        bytes32 obj,
        uint objId
    );

    enum BidAction {IN, OUT}

    RegulatingRatingView public regulatingRatingView;
    ReputationSystem public reputationSystem;
    ProjectController public projectController;
    uint public maxScore;

    modifier founderOnly(bytes32 namespace) {
        require(projectController != NULL);
        require(projectController.verifyOwner(namespace, msg.sender));
        _;
    }

    constructor (address kernelAddr, uint _maxScore) Module(kernelAddr) public {
        require(_maxScore > 0);

        CI = keccak256("RegulatingRating");
        maxScore = _maxScore;
    }

    function setView (address regulatingRatingViewAddress)
        external
        onlyOwner
    {
        regulatingRatingView = RegulatingRatingView(regulatingRatingViewAddress);
    }

    /**
    * Start rating process: called by MilestoneController
    *
    * @param namespace namespace of a project
    * @param milestoneId milestoneId of a milestone of the project
    * @param startTime start time of rating process
    * @param endTime end time of rating process
    * @param objs list of objectives' IPFS hash
    * @param objTypes list of objectives' type
    * @param objMaxRegulationRewards list of objectives' max regulation rewards
    */
    function start(
        bytes32 namespace,
        uint milestoneId,
        uint startTime,
        uint endTime,
        bytes32[] objs,
        bytes32[] objTypes,
        uint[] objMaxRegulationRewards
    )
        external
        connected
    {
        require(
            objs.length > 0 &&
            objs.length == objTypes.length &&
            objs.length == objMaxRegulationRewards.length
        );
        require(startTime >= now && startTime < endTime);

        for (uint  i = 0; i < objs.length; i++) {
            require(regulatingRatingView.getObjId(namespace, milestoneId, objs[i]) == 0);

            // obj id starts from 1 to remove confusion cased by the default value 0
            uint objId = i.add(1);

            initObjective(
                namespace,
                milestoneId,
                objId,
                objs[i],
                objTypes[i],
                objMaxRegulationRewards[i]
            );
        }

        initGlobalObjectiveInfo(namespace, milestoneId, objs.length, startTime, endTime);

        emit RegulatingRatingStarted(
            msg.sender,
            namespace,
            milestoneId,
            startTime,
            endTime,
            objs,
            objTypes,
            objMaxRegulationRewards
        );
    }

    /**
    * Finalize all the bids for objectives
    *
    * @param namespace namespace of a project
    * @param milestoneId milestoneId of a milestone of the project
    */
    function finalizeAllBids(bytes32 namespace, uint milestoneId) external founderOnly(namespace) {
        bytes32 pollId = keccak256(abi.encodePacked(namespace, milestoneId));
        require(reputationSystem.pollExpired(pollId));

        uint objLength = regulatingRatingStorage.getUint(
            keccak256(abi.encodePacked(namespace, milestoneId, GLOBAL_OBJ_ID, NULL, NUMBER_OBJECTIVES))
        );
        require(objLength > 0);

        uint rewardPercentage = regulatingRatingView.calRewardPercentage(namespace, milestoneId);

        for (uint i = 0; i < objLength; i++) {
            uint objId = i.add(1);
            if(regulatingRatingView.isObjIdFinalized(namespace, milestoneId, objId)) {
                continue;
            }
            finalizeBidForObjId(namespace, milestoneId, pollId, objId, rewardPercentage);
        }

        emit AllBidsFinalized(msg.sender, namespace, milestoneId);
    }

    /**
    * Finalize the bid of an objective that in rating process
    *
    * @param namespace namespace of a project
    * @param milestoneId milestoneId of a milestone of the project
    * @param obj an objective of a milestone of the project
    */
    function finalizeBidForObj(bytes32 namespace, uint milestoneId, bytes32 obj)
        external
        founderOnly(namespace)
    {
        bytes32 pollId = keccak256(abi.encodePacked(namespace, milestoneId));
        require(reputationSystem.pollExpired(pollId));

        uint objId = regulatingRatingView.verifyObj(namespace, milestoneId, obj);

        uint rewardPercentage = regulatingRatingView.calRewardPercentage(namespace, milestoneId);
        finalizeBidForObjId(namespace, milestoneId, pollId, objId, rewardPercentage);

        emit BidForObjFinalized(
            msg.sender,
            namespace,
            milestoneId,
            obj,
            objId
        );
    }

    /**
    * Bid for objective, which is called by regulator
    *
    * @param namespace namespace of a project
    * @param milestoneId milestoneId of a milestone of the project
    * @param obj an objective of a milestone of the project
    */
    function bid(bytes32 namespace, uint milestoneId, bytes32 obj) external {
        uint objId = regulatingRatingView.verifyObj(namespace, milestoneId, obj);
        uint registered = regulatingRatingStorage.getUint(
            keccak256(abi.encodePacked(namespace, milestoneId, objId, msg.sender, REGULATOR_BID))
        );
        require(registered == FALSE);
        regulatingRatingStorage.setUint(
            keccak256(abi.encodePacked(namespace, milestoneId, objId, msg.sender, REGULATOR_BID)),
            TRUE
        );
        registerRegulator(namespace, milestoneId, objId, msg.sender);
        regulatingRatingStorage.setUint(
            keccak256(abi.encodePacked(namespace, milestoneId, objId, msg.sender, OBJ_REGULATION_REWARD)),
            0
        );
        updateObjTotalReputationVotes(namespace, milestoneId, objId, msg.sender, BidAction.IN);

        emit BidByRegulator(
            msg.sender,
            namespace,
            milestoneId,
            obj,
            objId
        );
    }

    /**
    * Back out from the bid for objective, which is called by regulator
    *
    * @param namespace namespace of a project
    * @param milestoneId milestoneId of a milestone of the project
    * @param obj an objective of a milestone of the project
    */
    function backOutFromBid(bytes32 namespace, uint milestoneId, bytes32 obj) external {
        uint objId = regulatingRatingView.verifyObj(namespace, milestoneId, obj);
        uint registered = regulatingRatingStorage.getUint(
            keccak256(abi.encodePacked(namespace, milestoneId, objId, msg.sender, REGULATOR_BID))
        );
        require(registered == TRUE);

        regulatingRatingStorage.setUint(
            keccak256(abi.encodePacked(namespace, milestoneId, objId, msg.sender, REGULATOR_BID)),
            FALSE
        );
        unregisterRegulator(namespace, milestoneId, objId, msg.sender);
        regulatingRatingStorage.setUint(
            keccak256(abi.encodePacked(namespace, milestoneId, objId, msg.sender, OBJ_REGULATION_REWARD)),
            0
        );
        updateObjTotalReputationVotes(namespace, milestoneId, objId, msg.sender, BidAction.OUT);

        emit BackOutFromBidByRegulator(
            msg.sender,
            namespace,
            milestoneId,
            obj,
            objId
        );
    }

    /**
    * Regulator can vote a obj when obj finalize or in RegulatorVoteStage
    *
    * @param namespace namespace of a project (projectHash)
    * @param milestoneId milestoneId of a milestone of the project
    * @param obj objective of a milestone of the project
    * @param score the score that regulator(msg.sender) vote.
     */
    function regulatorVote(bytes32 namespace, uint milestoneId, bytes32 obj, uint score) 
        external
    {
        MilestoneControllerView milestoneControllerView = 
            MilestoneControllerView(contractAddressHandler.contracts(MILESTONE_CONTROLLER_VIEW_CI));
        uint objId = regulatingRatingView.getObjId(namespace, milestoneId, obj);

        bool regulatorVoteStageExpire = milestoneControllerView.regulatorVoteStageExpire(namespace, milestoneId);

        // require this regulator(msg.sender) already bid this object
        require(regulatingRatingView.isRegulatorBid(namespace, milestoneId, obj, msg.sender));

        // require this obj already finalized or in RegulatorVote stage
        uint objFinalized = regulatingRatingStorage.getUint(
            keccak256(abi.encodePacked(namespace, milestoneId, objId, NULL, FINALIZED)));
        bool isRVStage = milestoneControllerView.isRegulatorVoteStage(namespace, milestoneId);
        require ((objFinalized == TRUE && !regulatorVoteStageExpire) || isRVStage);

        // require score greater or equal than 0 and less or equal than maxScore
        require (score <= maxScore);

        regulatingRatingStorage.setUint(
            keccak256(abi.encodePacked(namespace, milestoneId, objId, msg.sender, REGULATOR_BID_SCORE)),
            score
        );

        emit RegulatorVote(namespace, milestoneId, objId, msg.sender, score);
    }

    /**
    * Bind with Reputation System
    *
    * @param reputationSystemAddr the address of Reputation System
    */
    function setReputationSystem(address reputationSystemAddr) public connected {
        reputationSystem = ReputationSystem(reputationSystemAddr);
    }

    /**
    * Bind with a storage contract
    * Create a new storage contract if _store == 0x0
    *
    * @param store the address of a storage contract
    */
    function setStorage(address store) public connected {
        super.setStorage(store);
        regulatingRatingStorage = RegulatingRatingStorage(storeAddr);
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
    * register a regulator for an objective bid
    *
    * @param namespace namespace of a project
    * @param milestoneId milestoneId of a milestone of the project
    * @param objId objective id of a milestone of the project
    * @param regulatorAddr address of regulator
    */
    function registerRegulator (
        bytes32 namespace,
        uint milestoneId,
        uint objId,
        address regulatorAddr
    )
        internal
    {
        address[] memory regulatorAddressList = regulatingRatingStorage.getAddressArray(
            keccak256(abi.encodePacked(namespace, milestoneId, objId, NULL, REGULATOR_ADDRESS_LIST))
        );

        address[] memory newRegulatorAddressList = new address[] (regulatorAddressList.length.add(1));
        for (uint i = 0; i < regulatorAddressList.length; i++) {
            newRegulatorAddressList[i] = regulatorAddressList[i];
        }
        newRegulatorAddressList[regulatorAddressList.length] = regulatorAddr;
        regulatingRatingStorage.setAddressArray(
            keccak256(abi.encodePacked(namespace, milestoneId, objId, NULL, REGULATOR_ADDRESS_LIST)),
            newRegulatorAddressList
        );
    }

    /**
    * unregister a regulator for an objective bid
    *
    * @param namespace namespace of a project
    * @param milestoneId milestoneId of a milestone of the project
    * @param objId objective id of a milestone of the project
    * @param regulatorAddr address of regulator
    */
    function unregisterRegulator(
        bytes32 namespace,
        uint milestoneId,
        uint objId,
        address regulatorAddr
    )
        internal
    {
        address[] memory regulatorAddressList = regulatingRatingStorage.getAddressArray(
            keccak256(abi.encodePacked(namespace, milestoneId, objId, NULL, REGULATOR_ADDRESS_LIST))
        );
        address[] memory newRegulatorAddressList = new address[] (regulatorAddressList.length.sub(1));

        uint index = 0;
        for (uint j = 0; j < regulatorAddressList.length; j++) {
            if(regulatorAddressList[j] == regulatorAddr){
                index = j;
                break;
            }
        }

        for (uint i = 0; i < newRegulatorAddressList.length; i++) {
            if(i != index && i < index){
                newRegulatorAddressList[i] = regulatorAddressList[i];
            } else {
                newRegulatorAddressList[i] = regulatorAddressList[i+1];
            }
        }
        regulatingRatingStorage.setAddressArray(
            keccak256(abi.encodePacked(namespace, milestoneId, objId, NULL, REGULATOR_ADDRESS_LIST)),
            newRegulatorAddressList
        );
    }

    /**
    * Initialize Objective
    *
    * @param namespace namespace of a project
    * @param milestoneId milestoneId of a milestone of the project
    * @param objId objective id
    * @param obj objective IPFS hash
    * @param objType objective type
    * @param objMaxRegulationReward  objectives' max regulation reward
    */
    function initObjective(
        bytes32 namespace,
        uint milestoneId,
        uint objId,
        bytes32 obj,
        bytes32 objType,
        uint objMaxRegulationReward
    )
        internal
    {
        regulatingRatingStorage.setUint(
            keccak256(abi.encodePacked(namespace, milestoneId, objId, NULL, FINALIZED)),
            FALSE
        );
        regulatingRatingStorage.setBytes32(
            keccak256(abi.encodePacked(namespace, milestoneId, objId, NULL, OBJ)),
            obj
        );
        regulatingRatingStorage.setUint(
            keccak256(abi.encodePacked(namespace, milestoneId, obj, NULL, OBJ_ID)),
            objId
        );
        regulatingRatingStorage.setBytes32(
            keccak256(abi.encodePacked(namespace, milestoneId, objId, NULL, OBJ_TYPE)),
            objType
        );
        regulatingRatingStorage.setUint(
            keccak256(abi.encodePacked(namespace, milestoneId, objId, NULL, OBJ_MAX_REGULATION_REWARD)),
            objMaxRegulationReward
        );
        regulatingRatingStorage.setAddressArray(
            keccak256(abi.encodePacked(namespace, milestoneId, objId, NULL, REGULATOR_ADDRESS_LIST)),
            new address[](0)
        );
    }

    /**
    * Initialize Global Objective Information
    *
    * @param namespace namespace of a project
    * @param milestoneId milestoneId of a milestone of the project
    * @param objsNum number of objectives
    * @param startTime start Time of the milestone
    * @param endTime end Time of the milestone
    */
    function initGlobalObjectiveInfo(
        bytes32 namespace,
        uint milestoneId,
        uint objsNum,
        uint startTime,
        uint endTime
    )
        internal
    {
        regulatingRatingStorage.setUint(
            keccak256(abi.encodePacked(namespace, milestoneId, GLOBAL_OBJ_ID, NULL, NUMBER_OBJECTIVES)),
            objsNum
        );
        regulatingRatingStorage.setUint(
            keccak256(abi.encodePacked(namespace, milestoneId, GLOBAL_OBJ_ID, NULL, START_TIME)),
            startTime
        );
        regulatingRatingStorage.setUint(
            keccak256(abi.encodePacked(namespace, milestoneId, GLOBAL_OBJ_ID, NULL, END_TIME)),
            endTime
        );
    }

    /**
    * Update ObjTotalReputationVotes by BidAction
    *
    * @param namespace namespace of a project
    * @param milestoneId milestoneId of a milestone of the project
    * @param objId objective id
    * @param regulatorAddress regulator address
    * @param bidAction BidAction performed by regulator
    */
    function updateObjTotalReputationVotes(
        bytes32 namespace,
        uint milestoneId,
        uint objId,
        address regulatorAddress,
        BidAction bidAction
    )
        internal
    {
        uint objTotalReputationVotes = regulatingRatingView.getObjTotalReputationVotes(namespace, milestoneId, objId);

        bytes32 objType = regulatingRatingStorage.getBytes32(
            keccak256(abi.encodePacked(namespace, milestoneId, objId, NULL, OBJ_TYPE))
        );
        bytes32 pollId = keccak256(abi.encodePacked(namespace, milestoneId));
        uint regulatorVotes = reputationSystem.getVotingResultForMember(
            pollId,
            regulatorAddress,
            objType
        );

        if (bidAction == BidAction.IN) {
            objTotalReputationVotes = objTotalReputationVotes.add(regulatorVotes);
        } else {
            objTotalReputationVotes = objTotalReputationVotes.sub(regulatorVotes);
        }
        regulatingRatingStorage.setUint(
            keccak256(abi.encodePacked(namespace, milestoneId, objId, NULL, OBJ_TOTAL_REPUTATION_VOTES)),
            objTotalReputationVotes
        );
    }

    /**
    * Finalize the bid of an objective by objective id that in rating process
    *
    * @param namespace namespace of a project
    * @param milestoneId milestoneId of a milestone of the project
    * @param pollId for the milestone
    * @param objId one objective id of a milestone of the project
    * @param rewardPercentage current reward percentage
    */

    function finalizeBidForObjId(
        bytes32 namespace,
        uint milestoneId,
        bytes32 pollId,
        uint objId,
        uint rewardPercentage
    )
        internal
    {
        regulatingRatingStorage.setUint(
            keccak256(abi.encodePacked(namespace, milestoneId, objId, NULL, FINALIZED)),
            TRUE
        );

        uint maxRegulationRewards = regulatingRatingStorage.getUint(
            keccak256(abi.encodePacked(namespace, milestoneId, objId, NULL, OBJ_MAX_REGULATION_REWARD))
        );

        uint currentRegulationRewards = maxRegulationRewards.mul(rewardPercentage).div(PERCENTAGE_BASE);
        address[] memory regulatorAddressList = regulatingRatingStorage.getAddressArray(
            keccak256(abi.encodePacked(namespace, milestoneId, objId, NULL, REGULATOR_ADDRESS_LIST))
        );

        bytes32 objType = regulatingRatingStorage.getBytes32(
            keccak256(abi.encodePacked(namespace, milestoneId, objId, NULL, OBJ_TYPE))
        );

        for (uint i = 0; i < regulatorAddressList.length; i++) {
            uint rewardPercentageForRegulator = regulatingRatingView.getRewardPercentageForRegulator(
                namespace,
                milestoneId,
                pollId,
                objId,
                objType,
                regulatorAddressList[i]
            );
            uint rewards = rewardPercentageForRegulator.mul(currentRegulationRewards).div(PERCENTAGE_BASE);
            regulatingRatingStorage.setUint(
                keccak256(abi.encodePacked(
                    namespace, milestoneId, objId, regulatorAddressList[i], OBJ_REGULATION_REWARD)),
                rewards
            );
        }

        emit BidForObjIdFinalized(msg.sender, namespace, milestoneId, objId, regulatorAddressList);
    }
}
