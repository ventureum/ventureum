pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "../Manager.sol";
import "./RefundManagerStorage.sol";


contract RefundManager is Manager {
    using SafeMath for uint;

    // events 
    event Refund (
        address indexed sender, 
        bytes32 indexed namespace, 
        uint milestoneId, 
        uint val,
        uint ethNum,
        uint availableTime
    );
    event Withdraw (
        address indexed sender, 
        bytes32 indexed namespace, 
        uint milestoneId, 
        uint balance
    );

    bytes32 constant public REFUND_MANAGER_STORAGE_CI = keccak256("RefundManagerStorage");

    bytes32 constant ETH_AMOUNT = "ethAmount";
    bytes32 constant AVAILABLE_TIME = "availableTime";

    uint constant public MILESTONE_RP = 3;
    uint constant public ONE_MONTH = 2592000;

    RefundManagerStorage private refundManagerStorage;

    constructor (address kernelAddr) Manager(kernelAddr) public {
        CI = keccak256("RefundManager");
    }

    /*
     * Refund investors during milestone's refund stage
     * Assume msg.sender has approved "val" tokens for this contract
     * First transfer "val" tokens from msg.sender to TokenCollector
     * Then write down the the number of weis to be refunded, using
     * the ICO average price from TokenSale.
     * The refund will be locked for 1 month, after the freeze period,
     * investors can then withdraw their refunds *
     * @param namespace namespace of the project
     * @param milestoneId id of a milestone
     * @val amount of tokens to be returned
     */
    function refund(bytes32 namespace, uint milestoneId, uint val) external {
        bytes32 ethAmountKey = keccak256(abi.encodePacked(namespace, milestoneId, ETH_AMOUNT));
        bytes32 availableTimeKey = keccak256(
            abi.encodePacked(namespace, milestoneId, AVAILABLE_TIME));

        ERC20 token = (ERC20)(projectController.getTokenAddress(namespace));

        require(refundManagerStorage.getUint(availableTimeKey) == 0);
        require(milestoneController.milestoneState(namespace, milestoneId) == MILESTONE_RP);

        //token approve 
        token.approve(tokenCollector, val);

        // trans token from user to this
        token.transferFrom(msg.sender, this, val);

        // trans token from this to tokenCollector
        tokenCollector.deposit(token, val);

        require(tokenSale.avgPrice(namespace) != 0);
        uint amount = val.div(tokenSale.avgPrice(namespace));
        uint availableTime = ONE_MONTH.add(now);

        refundManagerStorage.setUint(
            ethAmountKey,
            amount
        );

        refundManagerStorage.setUint(
            availableTimeKey,
            availableTime
        );

        emit Refund(msg.sender, namespace, milestoneId, val, amount, availableTime);
    }

    /*
     * Withdraw refunds after freeze period
     *
     * @param namespace namespace of the project
     * @param milestoneId id of a milestone
     */
    function withdraw(bytes32 namespace, uint milestoneId) external {
        bytes32 ethAmountKey = keccak256(abi.encodePacked(namespace, milestoneId, ETH_AMOUNT));
        bytes32 availableTimeKey = keccak256(
            abi.encodePacked(namespace, milestoneId, AVAILABLE_TIME));

        require(
            refundManagerStorage.getUint(availableTimeKey) != 0 && 
            refundManagerStorage.getUint(availableTimeKey) <= now);
        require(refundManagerStorage.getUint(ethAmountKey) <= address(etherCollector).balance);

        etherCollector.withdraw(msg.sender, refundManagerStorage.getUint(ethAmountKey));

        emit Withdraw(
            msg.sender, 
            namespace, 
            milestoneId, 
            refundManagerStorage.getUint(ethAmountKey)
        );
    }

    function setStorage(address store) public connected {
        super.setStorage(store);
        refundManagerStorage = RefundManagerStorage(store);
    }
}
