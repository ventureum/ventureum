Contract VTHManager is Ownable, States {

    // Ventureum Contract
    Ventureum public ven;

    // project meta info
    ProjectMeta public projectMeta;

    // number of VTH tokens staked
    mapping(address => uint) staked;

    struct RC {
        // RC of the subtree starting at this milestone
        uint subtree;
        // RC of this milestone
        uint vertex;
    }

    // milestone => investor address => refund coverage
    mapping(address => mapping(address => RC)) RCByMilestone;

    function stakeVTH(address milestoneAddr, uint value) external returns (uint) {

        /** In order to transfer tokens owned by someone else, we need to do it in
         * two steps:
         * 1. Investor call token.approve(milestoneAddr, value) from web3
         * 2. Transfer funds from the investor to this contract using transferFrom()
         */
        ERC20 token = projectMeta.VTHToken();
        require(token.transferFrom(msg.sender, address(this), value));

        // must be a valid milestone address
        require(projectMeta.isMilestone(milestoneAddr));
        Milestone milestone = Milestone(milestoneAddr);

        // must be at in a valid state
        require(milestone.state() == IP);

        // update number of VTH staked by this address
        staked[msg.sender] += value;

        // calculate refund coverage
        uint RCInWei = ven.mVTHToWei(value);

        RCByMilestone[milestoneAddr][msg.sender].vertex += RCInWei;
        RCByMilestone[milestoneAddr][msg.sender].subtree += RCInWei;

        // update all ancestors
        while(milestone.parent() != address(0x0)) {
            milestone = milestone.parent();
            RCByMilestone[milestone][msg.sender].subtree += RCInWei;
        }

        return RCInWei;
    }

    function withdrawVTH() external returns (bool) {
        // project must have been completed
        require(projectMeta.completed());

        // right now, continuous withdraw is not supported
        ERC20 vth = ERC20(ven.getVTHAddr());
        _stakedVTH = staked[msg.sender];
        staked[msg.sender] = 0;
        require(vth.transfer(msg.sender, _stakedVTH));

        return true;
    }

    // transfer remaining RC of a milestone to another milestone
    function transferRC(address from, address to, uint value) external returns (bool) {

        // must be a valid milestone address
        require(projectMeta.isMilestone(from));
        require(projectMeta.isMilestone(to));

        Milestone milestoneFrom = Milestone(from);
        Milestone milestoneTo = Milestone(to);

        // both must be in valid states
        require(milestoneFrom.state() == IP);
        require(milestoneTo.state() == IP);

        // now transfer RC
        require(value <= RCByMilestone[from][msg.sender]);

        RCByMilestone[from][msg.sender] -= value;
        RCByMilestone[to][msg.sender] += value;

        return true;
    }
}
