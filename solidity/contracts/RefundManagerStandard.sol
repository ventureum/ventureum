pragma solidity ^0.4.18;

import './Ownable.sol';
import './ProjectMeta.sol';
import './IRefundManager.sol';
import './SafeMath.sol';
import './Milestones.sol';
import './StakingController.sol';

contract RefundManagerStandard is IRefundManager {

    using SafeMath for uint;
    
    // project meta info
    ProjectMeta public projectMeta;
    Milestones public milestones;
    StakingController public stakingController;

    // milestone id => investor addr => refund status
    mapping(uint8 => mapping(address => bool)) refunded;

    function RefundManagerStandard(address projectMetaAddr) public {
        projectMeta = ProjectMeta(projectMetaAddr);
        stakingController = StakingController(projectMeta.getAddress(keccak256("contract.name", "StakingController")));
        milestones = Milestones(projectMeta.getAddress(keccak256("contract.name", "Milestones")));
    }

    // return the exact refund amount in wei
    function refundAmount(uint8 id, address investor) external returns (uint) {
        // must be a valid milestone id
        require(milestones.valid(id));

        // have not been refunded
        require(!refunded[id][investor]);

        uint totalStaked = stakingController.stakingAmount(id, investor);
        uint staked = stakingController.totalStakingAmount(id);

        return milestones.getWeiLocked(id).mul(staked).div(totalStaked);
    }

    // clear refund data
    function clear(uint8 id, address investor) external {
        // must be a valid milestone id
        require(milestones.valid(id));
        refunded[id][investor] = true;
    }
}
