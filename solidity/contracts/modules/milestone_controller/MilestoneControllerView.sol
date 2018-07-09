pragma solidity ^0.4.24;

import './MilestoneControllerStorage.sol';


contract MilestoneControllerView {
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

    MilestoneControllerStorage public milestoneControllerStore;

    constructor (address milestoneStoreAddress) public {
        milestoneControllerStore = MilestoneControllerStorage(milestoneStoreAddress);
    }

    /**
    * Get the number of milestone for given project hash
    *
    * @param namespace namespace of a project
    * @return the number of milestone for the given project
    */
    function getNumberOfMilestones(bytes32 namespace) 
        public
        view
        returns (uint256)
    {
        return milestoneControllerStore.getUint(
            keccak256(abi.encodePacked(namespace, GLOBAL_MILESTONE_ID, NUMBER_MILESTONES)));
    }

    /**
    * Get the milestone info
    *  [milestone length
    *   milestone state
    *   milestone start time
    *   milestone end time
    *   milestone wei locked]
    * @param namespace namespace of a project
    * @param milestoneId the id of milestone 
    */
    function getMilestoneInfo(bytes32 namespace, uint256 milestoneId) 
        public
        view
        returns (uint256, uint256, uint256, uint256, uint256)
    {
        uint256 milestoneLength = milestoneControllerStore.getUint(
            keccak256(abi.encodePacked(namespace, milestoneId, MILESTONE_LENGTH)));
        uint256 state = milestoneControllerStore.getUint(
            keccak256(abi.encodePacked(namespace, milestoneId, STATE)));
        uint256 startTime = milestoneControllerStore.getUint(
            keccak256(abi.encodePacked(namespace, milestoneId, START_TIME)));
        uint256 endTime = milestoneControllerStore.getUint(
            keccak256(abi.encodePacked(namespace, milestoneId, END_TIME)));
        uint256 weiLocked = milestoneControllerStore.getUint(
            keccak256(abi.encodePacked(namespace, milestoneId, WEI_LOCKED)));
        return (
            milestoneLength, 
            state, 
            startTime, 
            endTime, 
            weiLocked);
    }

    /**
    * Get the milestone obj info
    *  [milestone objs
    *   milestone objTypes
    *   milestone objMaxRegulationRewards]
    *
    * Note: this function is separated from the getMilestoneInfo, cause of stack too deep 
    *
    * @param namespace namespace of a project
    * @param milestoneId the id of milestone 
    */
    function getMilestoneObjInfo(bytes32 namespace, uint256 milestoneId) 
        public
        view
        returns (bytes32[], bytes32[], uint256[])
    {
        bytes32[] memory objs = milestoneControllerStore.getArray(
            keccak256(abi.encodePacked(namespace, milestoneId, OBJS)));
        bytes32[] memory objTypes = milestoneControllerStore.getArray(
            keccak256(abi.encodePacked(namespace, milestoneId, OBJ_TYPES)));
        uint256[] memory objMaxRegulationRewards = milestoneControllerStore.getUintArray(
            keccak256(abi.encodePacked(namespace, milestoneId, OBJ_MAX_REGULATION_REWARDS)));
        return (objs, objTypes, objMaxRegulationRewards);
    }
}

