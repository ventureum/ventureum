pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "repsys/contracts/ReputationSystem.sol";

import "./RegulatingRatingStorage.sol";
import "./RegulatingRatingConstants.sol";
import "./RegulatingRating.sol";
import "../milestone_controller/MilestoneControllerView.sol";


contract RegulatingRatingView is RegulatingRatingConstants {
    using SafeMath for uint;

    RegulatingRating public regulatingRating;
    ReputationSystem public reputationSystem;

    //address public NULL;

    constructor (address regulatingRatingAddress, address regulatingRatingStorageAddress, address reputationSystemAddress)
        public 
    {
        regulatingRatingStorage = RegulatingRatingStorage(regulatingRatingStorageAddress);
        regulatingRating = RegulatingRating(regulatingRatingAddress);
        reputationSystem = ReputationSystem(reputationSystemAddress);

        //NULL = regulatingRating.NULL();
    }

    /**
    * Get regulation rewards for an objective performed by a registered regulator
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
        returns (uint)
    {
        uint objId = getObjId(namespace, milestoneId, obj);
        require(objId > 0);
        uint registered = regulatingRatingStorage.getUint(
            keccak256(abi.encodePacked(namespace, milestoneId, objId, _addr, REGULATOR_BID))
        );
        require(registered == TRUE);
        return regulatingRatingStorage.getUint(keccak256(abi.encodePacked(
                namespace, milestoneId, objId, _addr, OBJ_REGULATION_REWARD))
        );
    }

    /**
    * check if an address is a regulator
    *
    * @param namespace namespace of a project
    * @param milestoneId milestoneId of a milestone of the project
    * @param obj an objective in a milestone of the project
    * @param _addr address of the regulator
    */
    function isRegulator(
        bytes32 namespace, 
        uint milestoneId, 
        bytes32 obj, 
        address _addr) 
        external 
        view 
        returns(bool) 
    {
        uint objId = getObjId(namespace, milestoneId, obj);
        uint registered = regulatingRatingStorage.getUint(
            keccak256(abi.encodePacked(namespace, milestoneId, objId, _addr, REGULATOR_BID))
        );
        return registered == TRUE;
    }

    /**
    * Return basic objective Info for an objective
    *
    * @param namespace namespace of a project
    * @param milestoneId milestoneId of a milestone of the project
    * @param obj objective of a milestone of the project
    */
    function getObjInfo(bytes32 namespace, uint milestoneId, bytes32 obj)
        external
        view
        returns (uint, bool, bytes32)
    {
        uint objId = getObjId(namespace, milestoneId, obj);
        require(objId > 0);

        uint finalized = regulatingRatingStorage.getUint(
            keccak256(abi.encodePacked(namespace, milestoneId, objId, NULL, FINALIZED))
        );

        bytes32 objType = regulatingRatingStorage.getBytes32(
            keccak256(abi.encodePacked(namespace, milestoneId, objId, NULL, OBJ_TYPE))
        );

        return (
            objId,
            finalized == TRUE,
            objType
        );
    }

    /**
    * Get the given regulator's voting weight and score
    *
    * @param namespace namespace of a project (projectHash)
    * @param milestoneId milestoneId of a milestone of the project
    * @param obj objective of a milestone of the project
    * @param regulator the address of regulator
     */
    function getRegulatorVoteInfo (bytes32 namespace, uint milestoneId, bytes32 obj, address regulator) 
        public
        view
        returns (uint, uint)
    {
        uint objId = getObjId(namespace, milestoneId, obj);

        uint score = regulatingRatingStorage.getUint(
            keccak256(abi.encodePacked(namespace, milestoneId, objId, regulator, REGULATOR_BID_SCORE)));

        bytes32 objType = regulatingRatingStorage.getBytes32(
            keccak256(abi.encodePacked(namespace, milestoneId, objId, NULL, OBJ_TYPE))
        );
        bytes32 pollId = keccak256(abi.encodePacked(namespace, milestoneId));
        uint weight = reputationSystem.getVotingResultForMember(
            pollId,
            regulator,
            objType
        );

        return (weight, score);
    }

    /**
    * Check whether RegulatingRating expires
    *
    * @param namespace namespace of a project
    * @param milestoneId milestoneId of a milestone of the project
    */
    function RegulatingRatingExpired(bytes32 namespace, uint milestoneId)
        external
        view
        returns (bool)
    {
        (,,uint endTime) = getGlobalObjInfo(namespace, milestoneId);
        return now > endTime;
    }

    /**
    * Return objective regulation reward info for an objective
    *
    * @param namespace namespace of a project
    * @param milestoneId milestoneId of a milestone of the project
    * @param obj objective of a milestone of the project
    */
    function getObjRegulationInfo(bytes32 namespace, uint milestoneId, bytes32 obj)
        external
        view
        returns (uint, uint, address[])
    {
        uint objId = getObjId(namespace, milestoneId, obj);
        require(objId > 0);

        uint objMaxRegulationReward = regulatingRatingStorage.getUint(
            keccak256(abi.encodePacked(namespace, milestoneId, objId, NULL, OBJ_MAX_REGULATION_REWARD))
        );

        uint objTotalReputationVotes = getObjTotalReputationVotes(namespace, milestoneId, objId);

        address[] memory regulatorAddressList = regulatingRatingStorage.getAddressArray(
            keccak256(abi.encodePacked(namespace, milestoneId, objId, NULL, REGULATOR_ADDRESS_LIST))
        );
        return (
            objMaxRegulationReward,
            objTotalReputationVotes,
            regulatorAddressList
        );
    }

    /**
    * Return the boolean shows if the given regulator bid the given object
    *
    * @param namespace namespace of a project
    * @param milestoneId milestoneId of a milestone of the project
    * @param obj objective of a milestone of the project
    * @param regulator the address for regulator
    */
    function isRegulatorBid(bytes32 namespace, uint milestoneId, bytes32 obj, address regulator) 
        public
        view
        returns (bool)
    {
        uint objId = getObjId(namespace, milestoneId, obj);
        uint registered = regulatingRatingStorage.getUint(
            keccak256(abi.encodePacked(namespace, milestoneId, objId, regulator, REGULATOR_BID)));
        return registered == TRUE;
    }

    /**
    * Return global objective Info for an milestone
    *
    * @param namespace namespace of a project
    * @param milestoneId milestoneId of a milestone of the project
    */
    function getGlobalObjInfo(bytes32 namespace, uint milestoneId)
        public
        view
        returns (uint, uint, uint)
    {
        uint startTime = regulatingRatingStorage.getUint(
            keccak256(abi.encodePacked(namespace, milestoneId, GLOBAL_OBJ_ID, NULL, START_TIME))
        );
        require(startTime != 0);
        uint endTime = regulatingRatingStorage.getUint(
            keccak256(abi.encodePacked(namespace, milestoneId, GLOBAL_OBJ_ID, NULL, END_TIME))
        );
        uint objsNum = regulatingRatingStorage.getUint(
            keccak256(abi.encodePacked(namespace, milestoneId, GLOBAL_OBJ_ID, NULL, NUMBER_OBJECTIVES))
        );

        return (objsNum, startTime, endTime);
    }


    /**
    * Calculate current Reward Percentage in the rating process
    *
    * @param namespace namespace of a project
    * @param milestoneId milestoneId of a milestone of the project
    */
    function calRewardPercentage(bytes32 namespace, uint milestoneId)
        public
        view
        returns (uint)
    {
        uint startTime = regulatingRatingStorage.getUint(
            keccak256(abi.encodePacked(namespace, milestoneId, GLOBAL_OBJ_ID, NULL, START_TIME))
        );
        uint endTime = regulatingRatingStorage.getUint(
            keccak256(abi.encodePacked(namespace, milestoneId, GLOBAL_OBJ_ID, NULL, END_TIME))
        );
        uint interval = endTime.sub(startTime);
        if (now < endTime) {
            endTime = now;
        }
        uint rewardPercentage = 
            (endTime.sub(startTime)).mul(regulatingRating.PERCENTAGE_BASE()).div(interval);
        return rewardPercentage;
    }


    /**
    * Return objective id if an objective is verified
    *
    * @param namespace namespace of a project
    * @param milestoneId milestoneId of a milestone of the project
    * @param obj objective of a milestone of the project
    */
    function verifyObj(bytes32 namespace, uint milestoneId, bytes32 obj)
        public
        view
        returns (uint)
    {
        uint objId = getObjId(namespace, milestoneId, obj);
        require(objId > 0);

        uint startTime = regulatingRatingStorage.getUint(
            keccak256(abi.encodePacked(namespace, milestoneId, GLOBAL_OBJ_ID, NULL, START_TIME))
        );
        uint endTime = regulatingRatingStorage.getUint(
            keccak256(abi.encodePacked(namespace, milestoneId, GLOBAL_OBJ_ID, NULL, END_TIME))
        );

        require(now >= startTime && now <= endTime);

        require(!isObjIdFinalized(namespace, milestoneId, objId));

        return objId;
    }

    /**
    * Return true if the objective in a milestone is finalized. If it not finalize and time
    *    expires, force to finalize it.
    *
    * @param namespace namespace of a project
    * @param milestoneId milestoneId of a milestone of the project
    * @param obj objective of a milestone of the project
    */
    function isObjFinalized(bytes32 namespace, uint milestoneId, bytes32 obj)
        public
        view
        returns (bool)
    {
        uint objId = getObjId(namespace, milestoneId, obj);
        return isObjIdFinalized(namespace, milestoneId, objId);
    }

    /**
    * Return true if the objective in a milestone is finalized. If it not finalize and time
    *    expires, force to finalize it.
    *
    * @param namespace namespace of a project
    * @param milestoneId milestoneId of a milestone of the project
    * @param objId objective id of a milestone of the project
    */
    function isObjIdFinalized(bytes32 namespace, uint milestoneId, uint objId)
        public
        view
        returns (bool)
    {
        uint finalized = regulatingRatingStorage.getUint(
            keccak256(abi.encodePacked(namespace, milestoneId, objId, NULL, FINALIZED))
        );
        return finalized == TRUE;
    }

    /**
    * Return objective id for an objective
    *
    * @param namespace namespace of a project
    * @param milestoneId milestoneId of a milestone of the project
    * @param obj objective of a milestone of the project
    */
    function getObjId(bytes32 namespace, uint milestoneId, bytes32 obj)
        public
        view
        returns (uint)
    {
        uint objId = regulatingRatingStorage.getUint(
            keccak256(abi.encodePacked(namespace, milestoneId, obj, NULL, OBJ_ID))
        );
        return objId;
    }

    /**
    * Return Total Reputation Vote for an objective
    *
    * @param namespace namespace of a project
    * @param milestoneId milestoneId of a milestone of the project
    * @param objId objective id of a milestone of the project
    */
    function getObjTotalReputationVotes(bytes32 namespace, uint milestoneId, uint objId)
        public
        view
        returns (uint)
    {
        return regulatingRatingStorage.getUint(
            keccak256(abi.encodePacked(namespace, milestoneId, objId, NULL, OBJ_TOTAL_REPUTATION_VOTES))
        );
    }

    /**
    * Return reward percentage for a regulator by the votes in Reputation System
    *
    * @param namespace namespace of a project
    * @param milestoneId milestoneId of a milestone of the project
    * @param pollId for the milestone
    * @param objId objective id of an objective in a milestone of the project
    * @param objType objective type of an objective in a milestone of the project
    * @param _addr address of the regulator
    */
    function getRewardPercentageForRegulator(
        bytes32 namespace,
        uint milestoneId,
        bytes32 pollId,
        uint objId,
        bytes32 objType,
        address _addr
    )
        public
        view
        returns (uint)
    {
        uint objTotalReputationVotes = getObjTotalReputationVotes(namespace, milestoneId, objId);
        uint regulatorVotes = reputationSystem.getVotingResultForMember(pollId, _addr, objType);

        if (objTotalReputationVotes == 0) {
            return 0;
        }

        return regulatorVotes.mul(regulatingRating.PERCENTAGE_BASE()).div(objTotalReputationVotes);
    }
}
