pragma solidity ^0.4.23;

import './ICriterion.sol';
import './ProjectMeta.sol';
import './StakingController.sol';
import './CriterionType.sol';
import './SafeMath.sol';

contract CriterionVote is ICriterion, CriterionType {

    using SafeMath for uint;

    ProjectMeta public projectMeta;
    StakingController public stakingController;

    uint8 constant public CRITERION_TYPE = CRITERION_TYPE_VOTE;

    // milestone id => disapproval rate
    mapping(uint8 => uint) disapproval;

    function CriterionVote(address projectMetaAddr) public {
        projectMeta = ProjectMeta(projectMetaAddr);

        // make sure StakingController address has been set in ProjectMeta
        stakingController = StakingController(projectMeta.getAddress(keccak256("contract.name", "StakingController")));
    }

    function vote(uint8 id) external {
        disapproval[id] = disapproval[id].add(stakingController.stakingAmount(id, msg.sender));
    }

    function satisfied(uint8 id) public view returns (bool) {
        return disapproval[id] <= stakingController.totalStakingAmount(id) - disapproval[id];
    }

    function t() public view returns (uint8) {
        return CRITERION_TYPE;
    }
}
