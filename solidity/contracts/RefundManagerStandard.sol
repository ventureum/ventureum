pragma solidity ^0.4.18;

import './Ownable.sol';
import './ProjectMeta.sol';
import './States.sol';
import './IRefundManager.sol';
import './SafeMath.sol';

// Standard RefundManager contract without using VTH
contract RefundManagerStandard is IRefundManager, Ownable, States {

    using SafeMath for uint;
    
    // project meta info
    ProjectMeta public projectMeta;

    // milestone => state => investor address => Refund
    mapping(uint8 => mapping(uint8 => mapping(address => uint))) public refundByMilestone;

    // milestone => total refund amount
    mapping(uint8 => mapping(uint8 => uint)) public totRefund;

    // update refund info for an investor
    function updateRefund(uint8 id, address investor, uint tokensStaked, uint8 state) external {
        // must be a valid milestone id
        require(projectMeta.milestones().valid(id));

        // can only be called from a ballot contract
        require(address(projectMeta.ballot()) == msg.sender);

        // token value in wei
        uint tokenValue = projectMeta.tokenToWei(tokensStaked);

        // update investor refund data
        refundByMilestone[id][state][investor] = tokenValue
        // update the total refund
        totRefund[id][state] = totRefund[id][state].add(tokenValue);
    }

    // return the exact refund amount in wei for both subtree and a single milestone vertex
    // refund amount of a subtree is used in RP
    // refund amount of a vertex is used in C
    function refundAmount(uint8 id, address investor, uint8 state) external returns (uint, uint) {
        // must be a valid milestone id
        Milestones milestones = projectMeta.milestones();
        require(milestones.valid(id));

        uint rTot = totRefund[id][state];

        uint refund = refundByMilestone[id][state][investor];

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
