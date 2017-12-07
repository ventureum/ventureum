Contract VTHManager is Ownable, States {

  // Ventureum Contract
  Ventureum public ven;

  // project meta info
  ProjectMeta public projectMeta;

  // number of VTH tokens staked
  mapping(address => uint) staked;

  // milestone => investor address => refund coverage
  mapping(address => mapping(address => uint)) RCByMilestone;

  function stakeVTH(address milestoneAddr, uint value) returns (uint) {

    /** In order to transfer tokens owned by someone else, we need to do it in
     * two steps:
     * 1. Investor call token.approve(milestoneAddr, value) from web3
     * 2. Transfer funds from the investor to this contract using transferFrom()
     */
    ERC20 token = ERC20(projectMeta.getVTHAddr());
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

    RCByMilestone[milestoneAddr][msg.sender] += RCInWei;
    return RCInWei;
  }

  function withdrawVTH() returns (bool) {
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
  function transferRC(address from, address to, uint value) returns (bool) {

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
