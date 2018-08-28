pragma solidity ^0.4.24;

import "./RegulatingRatingStorage.sol";


contract RegulatingRatingConstants {
    bytes32 constant START_TIME = keccak256("startTime");
    bytes32 constant END_TIME = keccak256("endTime");
    bytes32 constant FINALIZED = keccak256("finalized");
    bytes32 constant OBJ = keccak256("objective");
    bytes32 constant OBJ_ID = keccak256("objectiveId");
    bytes32 constant OBJ_TYPE = keccak256("objectiveType");
    bytes32 constant OBJ_MAX_REGULATION_REWARD = keccak256("objectiveMaxRegulationReward"); 
    bytes32 constant OBJ_REGULATION_REWARD = keccak256("objectiveRegulationReward");
    bytes32 constant OBJ_TOTAL_REPUTATION_VOTES = keccak256("objectiveTotalReputationVotes");
    bytes32 constant NUMBER_OBJECTIVES = keccak256("numberObjectives");
    bytes32 constant REGULATOR_BID = keccak256("regulatorBid");
    bytes32 constant REGULATOR_BID_SCORE = keccak256("regulatorBidScore");
    bytes32 constant REGULATOR_ADDRESS_LIST = keccak256("regulatorAddressList");

    uint constant GLOBAL_OBJ_ID = uint(-1);
    uint constant TRUE = 1;
    uint constant FALSE = 0;

    bytes32 constant MILESTONE_CONTROLLER_VIEW_CI = keccak256("MilestoneControllerView");

    address constant NULL = address(0x0);

    RegulatingRatingStorage public regulatingRatingStorage;
}
