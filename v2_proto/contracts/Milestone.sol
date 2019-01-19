pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./RepSys.sol";

contract Milestone {

    using SafeMath for uint;

    event RegisterProject(bytes32 projectId, address admin, string content);
    event UnregisterProject(bytes32 projectId);
    event AddMilestone(bytes32 projectId, uint milestoneId, string content, uint[] objMetaCompact, byte[] objContent);
    event ModifyMilestone(bytes32 projectId, uint milestoneId, string content, uint[] objMetaCompact, byte[] objContent);
    event RemoveMilestone(bytes32 projectId, uint milestoneId);
    event ActivateMilestone(bytes32 projectId, uint milestoneId, uint startTime);
    event FinalizeMilestone(bytes32 projectId, uint milestoneId, uint endTime);
    event RateObj(address proxy, bytes32 projectId, uint milestoneId, uint[] ratings, uint weight, string comment);
    event FinalizeValidators(bytes32 projectId, uint milestoneId, address[] proxies);

    struct Voter {
        uint rating;
        uint weight;
    }

    struct Obj {
        bool exist;
        bytes content;
        uint totalRating;
        uint totalWeight;
        mapping(address => Voter) voters;
    }

    struct MilestoneData {
        bool exist;
        string content;
        uint startTime;
        uint endTime;
        bool finalized;
        Obj[] objs;
        address[] validators;
    }

    struct Project {
        address admin;
        string content;
        bool activeMilestone; // one of the milestone is active
        uint currentMilestone;
        uint numMilestonesCompleted;
        MilestoneData[] milestones;
    }

    mapping(bytes32 => Project) private projects;

    address public repSysAddr;
    address public owner;

    modifier onlyProjectFounder() {
        (bytes4 userType, uint reputation) = RepSys(repSysAddr).getProfile(msg.sender);
        require(userType == bytes4(keccak256("PF")), "Musst be project founder");
        _;
    }

    modifier onlyProjectOwner(bytes32 projectId) {
        require(projects[projectId].admin == msg.sender, "Must be project owner");
        _;
    }

    modifier onlyOwner() {
        require(owner == msg.sender, "Must be ownber");
        _;
    }

    modifier onlyValidator() {
        (bytes4 userType, uint reputation) = RepSys(repSysAddr).getProfile(msg.sender);
        reputation; // supress warning
        require(userType == bytes4(keccak256("KOL")), "Must be KOL");
        _;
    }

    constructor(address _repSysAddr) public {
        repSysAddr = _repSysAddr;
        owner = msg.sender;
    }

    function unregisterProject(bytes32 projectId) external onlyProjectOwner(projectId) {
        Project storage p = projects[projectId];
        delete p.admin;
        delete p.milestones;

        emit UnregisterProject(projectId);
    }

    function registerProject(bytes32 projectId, string content) external onlyProjectFounder {
        Project storage p = projects[projectId];
        // has not been registered
        require(p.admin == address(0x0), "Project has already been registered");
        p.admin = msg.sender;
        p.content = content;

        // put a dummy milestone at index 0
        p.milestones.length++;

        emit RegisterProject(projectId, p.admin, content);
    }

    function modifyProject(bytes32 projectId, address admin, string content) external onlyProjectFounder {
        Project storage p = projects[projectId];
        require(p.admin != address(0x0), "Project does not exist");
        require(admin != address(0x0), "Invalid admin address");
        p.admin = admin;
        p.content = content;

        emit RegisterProject(projectId, p.admin, content);
    }

    function getProject(bytes32 projectId) external view returns (address, string, uint, uint, uint)  {
        Project storage p = projects[projectId];
        return (p.admin, p.content, p.currentMilestone, p.numMilestonesCompleted, p.milestones.length);
    }


    /*
     * overwrite obj content
     */
    function setObjContent(bytes storage content, byte[] memory data, uint start, uint len) internal {
        content.length = 0; // clear previous stored content
        for (uint i = start; i < start + len; i++) {
            content.push(data[i]);
        }
    }

    /*
     *  "stack too deep" workaround 
     */
    function objChangeHelper(
        bytes32 projectId,
        uint milestoneId,
        uint objMetaCompact,
        uint startIdx,
        byte[] objContent)
        internal
    {
        MilestoneData storage m = projects[projectId].milestones[milestoneId];
        bytes memory emptyContent;
        uint objCommand = objMetaCompact.mod(10);
        uint objId = (objMetaCompact.div(10)).mod(1000);
        uint objContentLen = objMetaCompact.div(10000);
        if (objCommand == 0) { // add
            if (objId >= m.objs.length) m.objs.length++; // push a new Obj
            addObj(projectId, milestoneId, emptyContent);
            setObjContent(m.objs[objId].content, objContent, startIdx, objContentLen);
        } else if (objCommand == 1) { // modify
            modifyObj(projectId, milestoneId, objId, emptyContent);
            setObjContent(m.objs[objId].content, objContent, startIdx, objContentLen);
        } else if (objCommand == 2) {
            removeObj(projectId, milestoneId, objId);
        }
    }

    function addMilestone(
        bytes32 projectId,
        string content,
        uint[] objMetaCompact, // [0] command [1..3] objId [4..] obj content lengh in bytes
        byte[] objContent)
        external
        onlyProjectOwner(projectId)
    {
        Project storage p = projects[projectId];

        MilestoneData storage m = p.milestones[p.milestones.length++];
        m.exist = true;
        m.content = content;

        // put a dummy obj at index 0
        m.objs.length++;

        uint startIdx = 0;
        for(uint i = 0; i < objMetaCompact.length; i++) {
            objChangeHelper(projectId, p.milestones.length - 1, objMetaCompact[i], startIdx, objContent);
            startIdx += objMetaCompact[i].div(10000);
        }

        emit AddMilestone(projectId, p.milestones.length - 1, content, objMetaCompact, objContent);
    }

    function modifyMilestone(
        bytes32 projectId,
        uint milestoneId,
        string content,
        uint[] objMetaCompact, // [0] command [1..3] objId [4..] obj content lengh in bytes
        byte[] objContent)
        external
        onlyProjectOwner(projectId)
    {
        Project storage p = projects[projectId];
        require(1 <= milestoneId && milestoneId < p.milestones.length, "Invalid milestone id");

        MilestoneData storage m = p.milestones[milestoneId];
        m.content = content;

        uint startIdx = 0;
        for(uint i = 0; i < objMetaCompact.length; i++) {
            objChangeHelper(projectId, milestoneId, objMetaCompact[i], startIdx, objContent);
            startIdx += objMetaCompact[i].div(10000);
        }

        emit AddMilestone(projectId, milestoneId, content, objMetaCompact, objContent);
    }

    function removeMilestone(bytes32 projectId, uint milestoneId) external onlyProjectOwner(projectId) {
        Project storage p = projects[projectId];
        require(1 <= milestoneId && milestoneId < p.milestones.length, "Invalid milestone id");
        p.milestones[milestoneId].exist = false;
        delete p.milestones[milestoneId].objs;

        emit RemoveMilestone(projectId, milestoneId);
    }

    function activateMilestone(bytes32 projectId, uint milestoneId, uint startTime) external onlyProjectOwner(projectId) {
        Project storage p = projects[projectId];
        require(1 <= milestoneId && milestoneId < p.milestones.length, "Invalid milestone id");

        // can only have one active milestone
        require(p.currentMilestone == 0, "At most one milestone can be activiated");
        p.currentMilestone = milestoneId;

        MilestoneData storage m = p.milestones[milestoneId];

        require(
            (startTime >= 0) && (m.endTime == 0),
            "Must be equal or larger than 0"
        );
        m.startTime = startTime == 0 ? now : startTime;

        emit ActivateMilestone(projectId, milestoneId, m.startTime);
    }

    function finalizeMilestone(bytes32 projectId, uint milestoneId, uint endTime) external onlyProjectOwner(projectId) {
        Project storage p = projects[projectId];
        require(1 <= milestoneId && milestoneId < p.milestones.length, "Invalid milestone id");
        require(p.currentMilestone == milestoneId, "Must be the current active milestone");

        MilestoneData storage m = p.milestones[milestoneId];


        require(
            (endTime == 0) || (endTime > 0 && m.startTime < endTime),
            "Must be zero or larger than current startTime"
        );
        m.endTime = endTime == 0 ? now : endTime;

        // clear current active milestone
        p.currentMilestone = 0;

        // update number of milestones completed
        p.numMilestonesCompleted += 1;

        emit FinalizeMilestone(projectId, milestoneId, m.endTime);
    }

    function addObj(bytes32 projectId, uint milestoneId, bytes content) public onlyProjectOwner(projectId) {
        Project storage p = projects[projectId];
        require(1 <= milestoneId && milestoneId < p.milestones.length, "Invalid milestone id");

        MilestoneData storage m = p.milestones[milestoneId];

        Obj storage o = m.objs[m.objs.length++];
        o.exist = true;
        o.content = content;
    }

    function modifyObj(bytes32 projectId, uint milestoneId, uint objId, bytes content) public onlyProjectOwner(projectId) {
        Project storage p = projects[projectId];
        require(1 <= milestoneId && milestoneId < p.milestones.length, "Invalid milestone id");

        MilestoneData storage m = p.milestones[milestoneId];
        require(1 <= objId && objId < m.objs.length, "Invalid obj id");

        m.objs[objId].content = content;
    }

    function removeObj(bytes32 projectId, uint milestoneId, uint objId) public onlyProjectOwner(projectId) {
        Project storage p = projects[projectId];
        require(1 <= milestoneId && milestoneId < p.milestones.length, "Invalid milestone id");

        MilestoneData storage m = p.milestones[milestoneId];
        require(1 <= objId && objId < m.objs.length, "Invalid obj id");
        m.objs[objId].exist = false;
    }

    function getMilestone(bytes32 projectId, uint milestoneId) external view returns (bool, string, uint, uint, uint) {
        Project storage p = projects[projectId];
        MilestoneData storage m = p.milestones[milestoneId];
        return (m.exist, m.content, m.startTime, m.endTime, m.objs.length);
    }

    function getObj(bytes32 projectId, uint milestoneId, uint objId) external view returns (bool, bytes, uint, uint) {
        Project storage p = projects[projectId];
        MilestoneData storage m = p.milestones[milestoneId];
        Obj storage o = m.objs[objId];
        return (o.exist, o.content, o.totalRating, o.totalWeight);
    }

    // dpos stuff
    function finalizeValidators(bytes32 projectId, uint milestoneId, uint limit) external onlyOwner {
        Project storage p = projects[projectId];

        // require(1 <= milestoneId && milestoneId < p.milestones.length, "Invalid milestone id");
        MilestoneData storage m = projects[projectId].milestones[milestoneId];
        address[] memory proxies = RepSys(repSysAddr).getTopValidators(projectId);

        // require(proxies.length > limit, "Insufficient number of proxies");

        // clear validators
        delete m.validators;

        // mark top 5 validators by reputation
        for(uint i = 0; i < limit; i++) {
            m.validators.push(proxies[i]);
        }

        emit FinalizeValidators(projectId, milestoneId, m.validators);
    }

    function isDesignatedValidator(bytes32 projectId, uint milestoneId, address proxy) internal {
        Project storage p = projects[projectId];
        MilestoneData storage m = p.milestones[milestoneId];

        // check if msg sender is the designated validator
        bool found = false;
        for (uint i = 0; i < m.validators.length; i++) {
            if (m.validators[i] == msg.sender) {
                found = true;
            }
        }
        require(found, "Must be a designated validator");
    }

    function rateObj(bytes32 projectId, uint milestoneId, uint[] ratings, string comment) external onlyValidator {
        Project storage p = projects[projectId];
        MilestoneData storage m = p.milestones[milestoneId];
        require(1 <= milestoneId && milestoneId < p.milestones.length, "Invalid milestone id");

        // must have been finalized
        /* solium-disable-next-line */
        require(now >= m.endTime, "Milestone must have been finalized");
        isDesignatedValidator(projectId, milestoneId, msg.sender);

        uint weight = RepSys(repSysAddr).getWeight(msg.sender);

        for(uint i = 0; i < ratings.length; i+=2) {
            require(1 <= ratings[i] && ratings[i] < m.objs.length, "Invalid obj id");

            Obj storage o = m.objs[ratings[i]];

            // can only vote once
            require(o.voters[msg.sender].rating == 0, "Can only vote once");

            o.totalRating = o.totalRating.add(weight.mul(ratings[i+1]));
            o.totalWeight = o.totalWeight.add(weight);

            o.voters[msg.sender].rating = ratings[i];
            o.voters[msg.sender].weight = weight;
        }

        emit RateObj(msg.sender, projectId, milestoneId, ratings, weight, comment);
    }
}
