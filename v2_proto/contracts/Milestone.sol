pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./RepSys.sol";

contract Milestone {

    using SafeMath for uint;

    struct Voter {
        uint score;
        uint weight;
        string comment;
    }

    struct Obj {
        bool exist;
        string content;
        uint totalScore;
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
    }

    struct Project {
        address admin;
        string content;
        uint currentMilestone;
        uint numMilestonesCompleted;
        MilestoneData[] milestones;
    }

    mapping(bytes32 => Project) private projects;

    address public repSysAddr;
    address public owner;

    modifier onlyProjectFounder() {
        (bool init, bytes4 userType, uint reputation) = RepSys(repSysAddr).getProfile(msg.sender);
        require(init && userType == bytes4(keccak256("PF")));
        _;
    }

    modifier onlyProjectOwner(bytes32 projectId) {
        require(projects[projectId].admin == msg.sender);
        _;
    }

    modifier onlyOwner() {
        require(owner == msg.sender);
        _;
    }

    modifier onlyValidator() {
        (bool init, bytes4 userType, uint reputation) = RepSys(repSysAddr).getProfile(msg.sender);
        require(init && userType == bytes4(keccak256("KOL")));
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
    }

    function registerProject(bytes32 projectId, string content) external onlyProjectFounder {
        Project storage p = projects[projectId];
        // has not been registered
        require(p.admin == address(0x0));
        p.admin = msg.sender;
        p.content = content;

        // put a dummy milestone at index 0
        p.milestones.length++;
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
    }

    function removeMilestone(bytes32 projectId, uint milestoneId) external onlyProjectOwner(projectId) {
        Project storage p = projects[projectId];
        require(0 < milestoneId && milestoneId < p.milestones.length);
        p.milestones[milestoneId].exist = false;
        delete p.milestones[milestoneId].objs;
    }

    function activateMilestone(bytes32 projectId, uint milestoneId) external onlyProjectOwner(projectId) {
        Project storage p = projects[projectId];
        require(0 < milestoneId && milestoneId < p.milestones.length);

        // can only have one active milestone
        require(p.currentMilestone == 0);
        p.currentMilestone = milestoneId;

        MilestoneData storage m = p.milestones[milestoneId];
        m.startTime = now;
    }

    function finalizeMilestone(bytes32 projectId, uint milestoneId) external onlyProjectOwner(projectId) {
        Project storage p = projects[projectId];
        require(0 < milestoneId && milestoneId < p.milestones.length);
        require(p.currentMilestone == milestoneId);

        MilestoneData storage m = p.milestones[milestoneId];
        m.endTime = now;

        p.currentMilestone = 0;
        p.numMilestonesCompleted += 1;
    }

    function addObj(bytes32 projectId, uint milestoneId, string objContent) external onlyProjectOwner(projectId) {
        Project storage p = projects[projectId];
        require(0 < milestoneId && milestoneId < p.milestones.length);

        MilestoneData storage m = p.milestones[milestoneId];

        Obj storage o = m.objs[m.objs.length++];
        o.exist = true;
        o.content = objContent;
    }

    function removeObj(bytes32 projectId, uint milestoneId, uint objId) external onlyProjectOwner(projectId) {
        Project storage p = projects[projectId];
        require(0 < milestoneId && milestoneId < p.milestones.length);

        MilestoneData storage m = p.milestones[milestoneId];
        require(objId < m.objs.length);
        m.objs[objId].exist = false;
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
        return (o.exist, o.content, o.totalScore, o.totalWeight);
    }

    // dpos stuff
    function objVote(bytes32 projectId, uint milestoneId, uint objId, uint score, string comment) external {
        Project storage p = projects[projectId];
        MilestoneData storage m = p.milestones[milestoneId];

        require(0 < milestoneId && milestoneId < p.milestones.length);
        require(objId < m.objs.length);

        // must have been finalized
        require(m.endTime != 0 && now > m.endTime);

        Obj storage o = m.objs[objId];
        Voter storage v = o.voters[msg.sender];

        // can only vote once
        require(v.score == 0);

        uint weight = RepSys(repSysAddr).getWeight(msg.sender);

        o.totalScore = o.totalScore.add(weight.mul(score));
        o.totalWeight = o.totalWeight.add(weight);

        v.score = score;
        v.weight = weight;
        v.comment = comment;
    }
}
