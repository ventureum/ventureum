pragma solidity ^0.4.18;

interface IBallot {
    function stake(uint8 id, uint value) public;
    function withdraw(uint8 id) public;
    function vote(uint8 id, bool approve) public returns (uint);
    function getApprovalRating(uint8 id, uint8 votingPeriodID) external view returns (uint);
    function getVotingResults(uint8 id, uint8 votingPeriodID) external view returns (bool);
    function hasApproved(uint8 id, address investor, uint8 votingPeriodID) public view returns (bool);
}
