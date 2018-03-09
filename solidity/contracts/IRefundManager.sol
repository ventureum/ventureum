pragma solidity ^0.4.18;

// Refund Manager Interface
contract IRefundManager {

    // submit a refund request and transfer tokens to this contract
    function refundRequest(uint8 id) external;

    // withdraw refunds after submitting a refund
    function withdraw(uint8 id);
}
