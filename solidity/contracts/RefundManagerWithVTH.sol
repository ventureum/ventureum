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

    // effective refunds
    struct Refund {
        // refund of the subtree
        uint subtree;
        // refund of this milestone
        uint vertex;
    }

    // milestone => state => investor address => Refund
    mapping(uint8 => mapping(uint8 => mapping(address => Refund))) private refundByMilestone;

    // milestone => total effective refund amount
    mapping(uint8 => mapping(uint8 => Refund)) private totEffRefund;

    // update refund info for an investor
    function updateRefund(uint8 id, address investor, uint tokensStaked, uint8 state) external {
        // must be a valid milestone id
        require(projectMeta.milestones().valid(id));

        // can only be called from a ballot contract
        require(address(projectMeta.ballot()) == msg.sender);

        VTHManager _VTHManager = projectMeta._VTHManager();
        var (RCSubtree, RCVertex) = _VTHManager.RCByMilestone(id, investor);

        // token value in wei
        uint tokenValue = projectMeta.tokenToWei(tokensStaked);

        // effective refund amount of the milestone
        uint effRefundVertex = RCSubtree.max(tokenValue);

        // effective refund amount of the subtree
        uint effRefundSubtree = RCVertex.max(tokenValue);

        // update investor refund data
        refundByMilestone[id][state][investor] = Refund(effRefundSubtree, effRefundVertex);

        // update the total effective refund
        totEffRefund[id][state].subtree = totEffRefund[id][state].subtree.add(effRefundSubtree);
        totEffRefund[id][state].vertex = totEffRefund[id][state].vertex.add(effRefundVertex);
    }

    // return the exact refund amount in wei for both subtree and a single milestone vertex
    // refund amount of a subtree is used in RP
    // refund amount of a vertex is used in C
    function refundAmount(uint8 id, address investor, uint8 state) external returns (uint, uint) {
        // must be a valid milestone id
        Milestones milestones = projectMeta.milestones();
        require(milestones.valid(id));

        Refund storage rTot = totEffRefund[id][state];

        // using "memory" to creat a copy
        Refund memory r = refundByMilestone[id][state][investor];

        var (subtree, vertex) = milestones.getWeiLocked(id);
        if(subtree < rTot.subtree) {
            // scale down effective refund amount
            r.subtree = (r.subtree.mul(subtree)).div(rTot.subtree);
        }

        if(vertex < rTot.vertex) {
            // scale down effective refund amount
            r.vertex = (r.vertex.mul(vertex)).div(rTot.vertex);
        }
        return (r.subtree, r.vertex);
    }

    // clear refund data
    function clear(uint8 id, address investor, uint8 state) external {
        // must be a valid milestone id
        require(projectMeta.milestones().valid(id));

        Refund storage r = refundByMilestone[id][state][investor];
        r.subtree = 0;
        r.vertex = 0;
    }
}
