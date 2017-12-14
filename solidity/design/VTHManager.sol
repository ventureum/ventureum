Contract VTHManager is Ownable, States {

    // Ventureum Contract
    Ventureum public ven;

    // project meta info
    ProjectMeta public projectMeta;

    // number of VTH tokens staked by investors
    mapping(address => uint) staked;

    struct RC {
        // RC of the subtree starting at this milestone
        uint subtree;
        // RC of this milestone
        uint vertex;
    }

    // milestone => investor address => refund coverage
    mapping(uint8 => mapping(address => RC)) RCByMilestone;

    function stakeVTH(uint8 id, uint value) external returns (uint) {

        /** In order to transfer tokens owned by someone else, we need to do it in
         * two steps:
         * 1. Investor call token.approve(milestoneAddr, value) from web3
         * 2. Transfer funds from the investor to this contract using transferFrom()
         */
        ERC20 token = projectMeta.VTHToken();
        require(token.transferFrom(msg.sender, address(this), value));

        // must be a valid milestone id
        Milestones milestones = projectMeta.milestones();
        require(milestones.valid(id));

        // must be at in a valid state
        require(milestones.state(id) == IP);

        // update number of VTH staked by this address
        staked[msg.sender] += value;

        // calculate refund coverage
        uint RCInWei = ven.mVTHToWei(value);

        RCByMilestone[id][msg.sender].vertex += RCInWei;
        RCByMilestone[id][msg.sender].subtree += RCInWei;

        // update all ancestors
        uint8 curr = id;
        while(true) {
            RCByMilestone[curr][msg.sender].subtree += RCInWei;
            if(curr != 0){
                curr = milestones.m(curr).parent;
            }
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
    function transferRC(uint8 from, uint8 to, uint value) external returns (bool) {

        // both must be valid milestone IDs
        Milestones milestones = projectMeta.milestones();
        require(milestones.valid(from));
        require(milestones.valid(to));

        // both must be in valid states
        require(milestones.state(from) == IP);
        require(milestones.state(to) == IP);

        // now transfer RC
        require(value <= RCByMilestone[from][msg.sender]);

        RCByMilestone[from][msg.sender] -= value;
        RCByMilestone[to][msg.sender] += value;

        return true;
    }
}
