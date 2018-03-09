pragma solidity ^0.4.18;

import './ProjectMeta.sol';
import './IRefundManager.sol';
import './SafeMath.sol';
import './Milestones.sol';
import './ERC20.sol';
import './ETHCollector.sol';
import './States.sol';

contract RefundManagerStandard is IRefundManager, States {

    using SafeMath for uint;
    
    // project meta info
    ProjectMeta public projectMeta;
    Milestones public milestones;

    struct Refund {
        bool refunded;
        uint refundAmount;
    }

    // milestone id => investor addr => refund status
    mapping(uint8 => mapping(address => Refund)) public refunds;
    
    function RefundManagerStandard(address projectMetaAddr) public {
        projectMeta = ProjectMeta(projectMetaAddr);
        milestones = Milestones(projectMeta.getAddress(keccak256("contract.name", "Milestones")));
    }

    function refundRequest(uint8 id, uint val) external {
        require(!refunds[id][msg.sender].refunded);
        require(milestones.state(id) == RP);

        refunds[id][msg.sender].refunded = true;

        var (maxRefund, unlimited) = milestones.getMaxRefund(id, msg.sender);
        ERC20 token =  ERC20(projectMeta.getAddress(keccak256("contract.name", "ERC20")));

        if (!unlimited) {
            val = val.max(maxRefund);
        }

        require(token.transferFrom(msg.sender, address(this), val));

        // # of tokens per wei
        uint price = projectMeta.getUint(keccak256("tokensale.price"));
        refunds[id][msg.sender].refundAmount = val.div(price);
    }

    function withdraw(uint8 id) external {
        // can only withdraw 30 days after the deadline
        require(now >= milestones.getDeadline(id) + 30 days);
        ETHController ethController = ETHController(projectMeta.getAddress(keccak256("contract.name", "ETHController")));
        ethController.withdraw(msg.sender, refunds[id][msg.sender].refundAmount);
    }
}
