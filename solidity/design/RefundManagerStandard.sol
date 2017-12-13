// Standard RefundManager contract without using VTH
Contract RefundManagerStandard is RefundManager, Ownable, States {
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

    // milestone => total refund amount
    mapping(address => mapping(uint8 => Refund)) public totRefund;

    // update refund info for an investor
    function updateRefund(address milestoneAddr, address investor, uint tokensStaked, uint8 state) external {
        // can only be called from a ballot contract
        require(address(projectMeta.ballot()) == msg.sender);

        // token value in wei
        uint tokenValue = projectMeta.tokenToWei(tokensStaked);

        // update investor refund data
        refundByMilestone[milestoneAddr][state][investor] = Refund(tokenValue, tokenValue);

        // update the total refund
        totRefund[milestoneAddr][state].subtree += tokenValue;
        totRefund[milestoneAddr][state].vertex += tokenValue;
    }

    // return the exact refund amount in wei for both subtree and a single milestone vertex
    // refund amount of a subtree is used in RP
    // refund amount of a vertex is used in C
    function refundAmount(address milestoneAddr, address investor, uint8 state) external returns (uint, uint) {
        Milestone milestone = Milestone(milestoneAddr);
        Refund rTot = totRefund[milestoneAddr][state];

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
