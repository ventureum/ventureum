// Refund Manager Interface
Contract RefundManager {
    // update refund info for an investor
    function updateRefund(address milestoneAddr, address investor, uint tokensStaked, uint8 state) external;

    // return the exact refund amount in wei of an investor for both subtree and a single milestone vertex
    // refund amount of a subtree is used in RP
    // refund amount of a vertex is used in C
    function refundAmount(address milestoneAddr, address investor, uint8 state) external returns (uint, uint)

    // clear refund info for an investor
    function clear(address milestoneAddr, address investor) external;
}
