pragma solidity ^0.4.18;

import './Ownable.sol';
import './ProjectMetaWithVTH.sol';
import './States.sol';
import './IRefundManager.sol';
import './VTHManager.sol';
import './SafeMath.sol';

contract RefundManagerWithVTH is IRefundManager, Ownable, States {

    using SafeMath for uint;

    // project meta info
    ProjectMetaWithVTH public projectMeta;


    // milestone => state => investor address => refund
    mapping(uint8 => mapping(uint8 => mapping(address => uint))) public refundByMilestone;

    // milestone => total effective refund amount
    mapping(uint8 => mapping(uint8 => uint)) public totEffRefund;

    // update refund info for an investor
    function updateRefund(uint8 id, address investor, uint tokensStaked, uint8 state) external {
        // must be a valid milestone id
        require(projectMeta.milestones().valid(id));

        // can only be called from a ballot contract
        require(address(projectMeta.ballot()) == msg.sender);

        VTHManager _VTHManager = projectMeta._VTHManager();
        uint RC  = _VTHManager.RCByMilestone(id, investor);

        // token value in wei
        uint tokenValue = projectMeta.tokenToWei(tokensStaked);

        // effective refund amount of the milestone
        uint effRefund = RC.max(tokenValue);

        // update investor refund data
        refundByMilestone[id][state][investor] = effRefund;

        // update the total effective refund
        totEffRefund[id][state] = totEffRefund[id][state].add(effRefund);
    }

    // return the exact refund amount in wei for both subtree and a single milestone vertex
    // refund amount of a subtree is used in RP
    // refund amount of a vertex is used in C
    function refundAmount(uint8 id, address investor, uint8 state) external returns (uint, uint) {
        // must be a valid milestone id
        Milestones milestones = projectMeta.milestones();
        require(milestones.valid(id));

        uint rTot = totEffRefund[id][state];

        uint refund  = refundByMilestone[id][state][investor];

        var (subtree, vertex) = milestones.getWeiLocked(id);

        uint subtreeRefund = 0;
        uint vertexRefund = 0;

        if(subtree < rTot) {
            // scale down effective refund amount
            subtreeRefund = (refund.mul(subtree)).div(rTot);
        }

        if(vertex < rTot) {
            // scale down effective refund amount
            vertexRefund = (refund.mul(vertex)).div(rTot);
        }
        return (subtreeRefund, vertexRefund);
    }

    // clear refund data
    function clear(uint8 id, address investor, uint8 state) external {
        // must be a valid milestone id
        require(projectMeta.milestones().valid(id));

        refundByMilestone[id][state][investor] = 0;
    }
}
