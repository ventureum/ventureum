Contract RefundManagerWithVTH is RefundManager, Ownable, States {
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
    mapping(address => mapping(uint8 => mapping(address => Refund))) public refundByMilestone;

    // milestone => total effective refund amount
    mapping(address => mapping(uint8 => Refund)) public totEffRefund;

    // update refund info for an investor
    function updateRefund(address milestoneAddr, address investor, uint tokensStaked, uint8 state) external {
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

        // update investor refund data
        refundByMilestone[milestoneAddr][state][investor] = Refund(effRefundSubtree, effRefundVertex);

        // update the total effective refund
        totEffRefund[milestoneAddr][state].subtree += effRefundSubtree;
        totEffRefund[milestoneAddr][state].vertex += effRefundVertex;
    }

    // return the exact refund amount in wei for both subtree and a single milestone vertex
    // refund amount of a subtree is used in RP
    // refund amount of a vertex is used in C
    function refundAmount(address milestoneAddr, address investor, uint8 state) external returns (uint, uint) {
        Milestone milestone = Milestone(milestoneAddr);
        Refund rTot = totEffRefund[milestoneAddr][state];

        // using "memory" to creat a copy
        Refund memory r = refundByMilestone[milestoneAddr][state][investor];

        WeiLocked weiLocked = milestone.weiLocked();
        if(weiLocked.subtree < rTot.subtree) {
            // scale down effective refund amount
            r.subtree = (r.subtree * weiLocked.subtree) / rTot.subtree;
        }

        if(weiLocked.vertex < rTot.vertex) {
            // scale down effective refund amount
            r.vertex = (r.vertex * weiLocked.vertex) / rTot.vertex;
        }
        return (r.subtree, r.vertex);
    }

    // clear refund data
    function clear(address milestoneAddr, address investor, uint8 state) {
        Refund storage r = refundByMilestone[milestoneAddr][state][investor];
        r.subtree = 0;
        r.vertex = 0;
    }
}
