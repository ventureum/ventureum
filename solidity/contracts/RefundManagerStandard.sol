pragma solidity ^0.4.18;

import './Ownable.sol';
import './ProjectMeta.sol';
import './States.sol';
import './RefundManager.sol';
import './SafeMath.sol';

// Standard RefundManager contract without using VTH
contract RefundManagerStandard is RefundManager, Ownable, States {

    // using SafeMath for uint;

    // project meta info
    ProjectMeta public projectMeta;

    // effective refunds
    struct Refund {
        // refund of the subtree
        uint subtree;
        // refund of this milestone
        uint vertex;
    }

    // milestone => state => investor address => Refund
    mapping(uint8 => mapping(uint8 => mapping(address => Refund))) private refundByMilestone;

    // milestone => total refund amount
    mapping(uint8 => mapping(uint8 => Refund)) private totRefund;

    // update refund info for an investor
    function updateRefund(uint8 id, address investor, uint tokensStaked, uint8 state) external {
        // must be a valid milestone id
        require(projectMeta.milestones().valid(id));

        // can only be called from a ballot contract
        require(address(projectMeta.ballot()) == msg.sender);

        // token value in wei
        uint tokenValue = projectMeta.tokenToWei(tokensStaked);

        // update investor refund data
        refundByMilestone[id][state][investor] = Refund(tokenValue, tokenValue);

        // update the total refund
        totRefund[id][state].subtree = totRefund[id][state].subtree.add(tokenValue);
        totRefund[id][state].vertex = totRefund[id][state].vertex.add(tokenValue);
    }

    // return the exact refund amount in wei for both subtree and a single milestone vertex
    // refund amount of a subtree is used in RP
    // refund amount of a vertex is used in C
    function refundAmount(uint8 id, address investor, uint8 state) external returns (uint, uint) {
        // must be a valid milestone id
        Milestones milestones = projectMeta.milestones();
        require(milestones.valid(id));

        Refund storage rTot = totRefund[id][state];

        // using "memory" to creat a copy
        Refund memory r = refundByMilestone[id][state][investor];

        var (subtree, vertex) = milestones.getWeiLocked(id);
        if(subtree < rTot.subtree) {
            // scale down effective refund amount
            // r.subtree = (r.subtree.mul(subtree)).div(rTot.subtree);
        }

        if(vertex < rTot.vertex) {
            // scale down effective refund amount
            // r.vertex = (r.vertex.mul(vertex)).div(rTot.vertex);
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
