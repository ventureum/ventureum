pragma solidity ^0.4.18;

// Refund Manager Interface
contract IRefundManager {

    // return the exact refund amount in wei of an investor
    function refundAmount(uint8 id, address investor) external returns (uint);

    // clear refund info for an investor
    function clear(uint8 id, address investor) external;
}
