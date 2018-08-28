pragma solidity ^0.4.24;


contract MilestoneControllerConstants {

    bytes32 constant START_TIME = keccak256("startTime");
    bytes32 constant END_TIME = keccak256("endTime");
    bytes32 constant WEI_LOCKED = keccak256("weiLocked");
    bytes32 constant STATE = keccak256("state");
    bytes32 constant OBJS = keccak256("objs");
    bytes32 constant OBJ_TYPES = keccak256("objTypes");
    bytes32 constant OBJ_MAX_REGULATION_REWARDS = keccak256("objMaxRegulationRewards");
    bytes32 constant CUMULATIVE_MAX_REGULATION_REWARDS = keccak256("cumulativeMaxRegulationRewards");
    bytes32 constant NUMBER_MILESTONES = keccak256("numberMilestones");
    bytes32 constant MILESTONE_LENGTH = keccak256("milestoneLength");
    //bytes32 constant MILESTONE_LENGTH = "milestoneLength";

    uint constant GLOBAL_MILESTONE_ID = uint(-1);
    uint constant MAX_REGULATION_REWARD_PERCENTAGE = 10;
    address constant NULL = address(0x0);
}
