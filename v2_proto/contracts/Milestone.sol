pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./RepSys.sol";

contract Milestone {

    using SafeMath for uint;

    event RegisterProject(bytes32 projectId, address admin, string content);
    event UnregisterProject(bytes32 projectId);
    event AddMilestone(bytes32 projectId, uint milestoneId, string content);
    event RemoveMilestone(bytes32 projectId, uint milestoneId);
    event ActivateMilestone(bytes32 projectId, uint milestoneId, uint startTime);
    event FinalizeMilestone(bytes32 projectId, uint milestoneId, uint endTime);
    event AddObj(bytes32 projectId, uint milestoneId, uint objId, string content);
    event RemoveObj(bytes32 projectId, uint milestoneId, uint objId);
    event RateObj(address proxy, bytes32 projectId, uint milestoneId, uint objId, uint rating, uint weight, string comment);
    event FinalizeValidators(bytes32 projectId, uint milestoneId, address[] proxies);

    struct Voter {
        uint rating;
        uint weight;
        string comment;
    }

    struct Obj {
        bool exist;
        string content;
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

    function getProject(bytes32 projectId) external view returns (address, string, uint, uint, uint)  {
        Project storage p = projects[projectId];
        return (p.admin, p.content, p.currentMilestone, p.numMilestonesCompleted, p.milestones.length);
    }

    function addMilestone(bytes32 projectId, string content) external onlyProjectOwner(projectId) {
        Project storage p = projects[projectId];

        MilestoneData storage m = p.milestones[p.milestones.length++];
        m.exist = true;
        m.content = content;

        // put a dummy obj at index 0
        m.objs.length++;

        emit AddMilestone(projectId, p.milestones.length - 1, content);
    }

    function removeMilestone(bytes32 projectId, uint milestoneId) external onlyProjectOwner(projectId) {
        Project storage p = projects[projectId];
        require(1 <= milestoneId && milestoneId < p.milestones.length, "Invalid milestone id");
        p.milestones[milestoneId].exist = false;
        delete p.milestones[milestoneId].objs;

        emit RemoveMilestone(projectId, milestoneId);
    }

    function activateMilestone(bytes32 projectId, uint milestoneId) external onlyProjectOwner(projectId) {
        Project storage p = projects[projectId];
        require(1 <= milestoneId && milestoneId < p.milestones.length, "Invalid milestone id");

        // can only have one active milestone
        require(p.currentMilestone == 0, "At most one milestone can be activiated");
        p.currentMilestone = milestoneId;

        MilestoneData storage m = p.milestones[milestoneId];

        /* solium-disable-next-line */
        m.startTime = now;

        emit ActivateMilestone(projectId, milestoneId, m.startTime);
    }

    function finalizeMilestone(bytes32 projectId, uint milestoneId) external onlyProjectOwner(projectId) {
        Project storage p = projects[projectId];
        require(1 <= milestoneId && milestoneId < p.milestones.length, "Invalid milestone id");
        require(p.currentMilestone == milestoneId, "Must be the current active milestone");

        MilestoneData storage m = p.milestones[milestoneId];

        /* solium-disable-next-line */
        m.endTime = now;

        // clear current active milestone
        p.currentMilestone = 0;

        // update number of milestones completed
        p.numMilestonesCompleted += 1;

        emit FinalizeMilestone(projectId, milestoneId, m.endTime);
    }

    function addObj(bytes32 projectId, uint milestoneId, string content) external onlyProjectOwner(projectId) {
        Project storage p = projects[projectId];
        require(1 <= milestoneId && milestoneId < p.milestones.length, "Invalid milestone id");

        MilestoneData storage m = p.milestones[milestoneId];

        Obj storage o = m.objs[m.objs.length++];
        o.exist = true;
        o.content = content;

        emit AddObj(projectId, milestoneId, m.objs.length - 1, content);
    }

    function removeObj(bytes32 projectId, uint milestoneId, uint objId) external onlyProjectOwner(projectId) {
        Project storage p = projects[projectId];
        require(1 <= milestoneId && milestoneId < p.milestones.length, "Invalid milestone id");

        MilestoneData storage m = p.milestones[milestoneId];
        require(1 <= objId && objId < m.objs.length, "Invalid obj id");
        m.objs[objId].exist = false;

        emit RemoveObj(projectId, milestoneId, objId);
    }

    function getMilestone(bytes32 projectId, uint milestoneId) external view returns (bool, string, uint, uint, uint) {
        Project storage p = projects[projectId];
        MilestoneData storage m = p.milestones[milestoneId];
        return (m.exist, m.content, m.startTime, m.endTime, m.objs.length);
    }

    function getObj(bytes32 projectId, uint milestoneId, uint objId) external view returns (bool, string, uint, uint) {
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

        // mark top 5 validators by reputation
        for(uint i = 0; i < limit; i++) {
            m.validators.push(proxies[i]);
        }

        emit FinalizeValidators(projectId, milestoneId, m.validators);
    }

    function rateObj(bytes32 projectId, uint milestoneId, uint objId, uint rating, string comment) external onlyValidator {
        Project storage p = projects[projectId];
        MilestoneData storage m = p.milestones[milestoneId];

        require(1 <= milestoneId && milestoneId < p.milestones.length, "Invalid milestone id");
        require(1 <= objId && objId < m.objs.length, "Invalid obj id");

        // must have been finalized
        /* solium-disable-next-line */
        require(now >= m.endTime, "Obj must have been finalized");

        Obj storage o = m.objs[objId];
        Voter storage v = o.voters[msg.sender];

        // can only vote once
        require(v.rating == 0, "Can only vote once");

        uint weight = RepSys(repSysAddr).getWeight(msg.sender);

        o.totalRating = o.totalRating.add(weight.mul(rating));
        o.totalWeight = o.totalWeight.add(weight);

        v.rating = rating;
        v.weight = weight;
        v.comment = comment;

        emit RateObj(msg.sender, projectId, milestoneId, objId, rating, weight, comment);
    }
}
