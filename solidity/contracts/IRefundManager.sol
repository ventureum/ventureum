pragma solidity ^0.4.18;

// Refund Manager Interface
contract IRefundManager {
    // update refund info for an investor
    function updateRefund(uint8 id, address investor, uint tokensStaked, uint8 state) external;

    // return the exact refund amount in wei of an investor for both subtree and a single milestone vertex
    // refund amount of a subtree is used in RP
    // refund amount of a vertex is used in C
    function refundAmount(uint8 id, address investor, uint8 state) external returns (uint, uint);

    // clear refund info for an investor
    function clear(uint8 id, address investor, uint8 state) external;
}
