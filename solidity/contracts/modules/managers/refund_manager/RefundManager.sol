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

    bytes32 constant MILESTONE_ETHER_REFUND_LOCKED = keccak256("milestoneEtherRefundLocked");
    bytes32 constant AVAILABLE_TIME = keccak256("availableTime");

    uint constant public MILESTONE_RP = 3;

    uint public lockDuration;

    RefundManagerStorage private refundManagerStorage;

    constructor (address kernelAddr, uint _lockDuration) Manager(kernelAddr) public {
        CI = keccak256("RefundManager");
        lockDuration = _lockDuration;
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
        // require milestone is Refund Stage
        require(milestoneController.milestoneState(namespace, milestoneId) == MILESTONE_RP);

        bytes32 availableTimeKey = keccak256(abi.encodePacked(
            namespace,
            milestoneId,
            msg.sender,
            AVAILABLE_TIME));

        ERC20 token = (ERC20)(projectController.getTokenAddress(namespace));

        // check if already refund
        require(refundManagerStorage.getUint(availableTimeKey) == 0);

        // trans token from user to this
        token.transferFrom(msg.sender, this, val);

        // trans token from this to tokenCollector
        token.approve(tokenCollector, val);
        tokenCollector.deposit(
            keccak256(abi.encodePacked(namespace, PROJECT_TOKEN_BALANCE)), 
            token, 
            val);

        // calculate the refund amount
        require(tokenSale.avgPrice(namespace) != 0);
        uint amount = val.div(tokenSale.avgPrice(namespace));

        // set the lock duration to one month
        uint availableTime = lockDuration.add(now);

        // use insideTransfer to lock amount ether from weiLocked
        bytes32 fromKey= keccak256(abi.encodePacked(
            namespace,
            milestoneId,
            MILESTONE_ETHER_WEILOCKED));
        bytes32 toKey= keccak256(abi.encodePacked(
            namespace,
            milestoneId,
            msg.sender,
            MILESTONE_ETHER_REFUND_LOCKED));
        etherCollector.insideTransfer(fromKey, toKey, amount);

        // record how many ether this investor refund in this milestone.
        // Note: this number will never change, just for record, 
        //       delete it if no need
        refundManagerStorage.setUint(
            toKey,
            amount
        );

        // store the available time (IMPORTANT!)
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
        bytes32 availableTimeKey = keccak256(abi.encodePacked(
            namespace, 
            milestoneId, 
            msg.sender, 
            AVAILABLE_TIME));

        // require this refund exist and already pass the lock time.
        require(
            refundManagerStorage.getUint(availableTimeKey) != 0 && 
            refundManagerStorage.getUint(availableTimeKey) <= now);

        bytes32 ethAmountKey = keccak256(abi.encodePacked(
            namespace, 
            milestoneId, 
            msg.sender, 
            MILESTONE_ETHER_REFUND_LOCKED));

        // get the total amount ether that can withdraw
        uint amount = etherCollector.getDepositValue(ethAmountKey);

        // withdraw ether
        etherCollector.withdraw(
            ethAmountKey,
            msg.sender, 
            amount);

        emit Withdraw(
            msg.sender, 
            namespace, 
            milestoneId, 
            amount
        );
    }

    /*
     * get the refund info for the given milestone 
     *
     * @param namespace namespace of the project
     * @param milestoneId id of a milestone
     * @return :
     *    bool, to check if msg.sender can withdraw or not
     *    uint, the number of ether(wei) that can be withdraw if available
     *    uint, the availableTime
     *    uint, the total number of ether(wei) in this refund 
     *        (Note: total = canBeWithdrawn + withdrawn)
     */
    function getRefundInfo(bytes32 namespace, uint milestoneId) 
        external 
        view
        returns (bool, uint, uint, uint)
    {
        bytes32 ethAmountKey = keccak256(abi.encodePacked(
            namespace, 
            milestoneId, 
            msg.sender, 
            MILESTONE_ETHER_REFUND_LOCKED));
        bytes32 availableTimeKey = keccak256(abi.encodePacked(
            namespace, 
            milestoneId, 
            msg.sender, 
            AVAILABLE_TIME));

        uint availableTime = refundManagerStorage.getUint(availableTimeKey);
        uint totalEther = refundManagerStorage.getUint(ethAmountKey);
        uint availableEther = etherCollector.getDepositValue(ethAmountKey);
        bool canWithdraw = availableTime != 0 && 
            availableTime <= now &&
            availableEther > 0;

        return (canWithdraw, availableEther, availableTime, totalEther);
    }

    function setStorage(address store) public connected {
        super.setStorage(store);
        refundManagerStorage = RefundManagerStorage(store);
    }
}
