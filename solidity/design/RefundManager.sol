Contract RefundManager is Ownable, States {

    // project meta info
    ProjectMeta public projectMeta;

    // effective refunds
    struct Refund {
        // refund of the subtree
        uint subtree;
        // refund of this milestone
        uint vertex;
    }

    // milestone => investor address => Refund
    mapping(address => mapping(address => Refund)) RefundByMilestone;

    // update refund info for an investor
    function updateRefund(address milestoneAddr, address investor, uint tokensStaked) external {
        // can only be called from a ballot contract
        require(projectMeta.getBallotAddr() == msg.sender);

        VTHManager _VTHManager = VTHManager(projectMeta.getVTHManagerAddr());
        (uint RCSubtree, uint RCVertex) = _VTHManager.RCByMilestone(milestoneAddr, investo);

        // token value in wei
        uint tokenValue = projectMeta.tokenToWei(tokensStaked);

        // effective refund amount of the milestone
        uint effRefundVertex = max(RCSubtree, tokenValue);

        // effective refund amount of the subtree
        uint effRefundSubtree = max(RCVertex, tokenValue);

        // update refund data
        RefundByMilestone[milestoneAddr][investor] = Refund(effRefundSubtree, effRefundVertex);
    }
}
