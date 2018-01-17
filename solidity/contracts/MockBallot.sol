pragma solidity ^0.4.18;

import './Ownable.sol';
import './States.sol';
import './SafeMath.sol';
import './IBallot.sol';

contract MockBallot is IBallot, Ownable, States {

     using SafeMath for uint;

    mapping(uint8 => mapping(uint8 => bool)) public mockVotingResults;

    function setVotingResults(uint8 id, uint8 votingPeriodID, bool val) external {
        mockVotingResults[id][votingPeriodID] = val;
    }

    function stake(uint8 id, uint value) public {}

    function withdraw(uint8 id) public {}

    function vote(uint8 id, bool approve) public returns (uint) {
        return 0;
    }

    function getApprovalRating(uint8 id, uint8 votingPeriodID) external view returns (uint){
        return 0;
    }

    function getVotingResults(uint8 id, uint8 votingPeriodID) external view returns (bool) {
        return mockVotingResults[id][votingPeriodID];
    }

    function hasApproved(uint8 id, address investor, uint8 votingPeriodID) public view returns (bool) {
        return false;
    }

}
