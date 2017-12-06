Contract VTHManager is Ownable, States {

  // Ventureum Contract
  Ventureum public ven;

  // number of VTH tokens staked
  mapping(address => uint) staked;

  // milestone => investor address => refund coverage
  mapping(address => mapping(address => uint)) RCByMilestone

  function stakeVTH(address milestoneAddr, uint value) {

    /** In order to transfer tokens owned by someone else, we need to do it in
     * two steps:
     * 1. Investor call token.approve(milestoneAddr, value) from web3
     * 2. Transfer funds from the investor to this contract using transferFrom()
     */
    ERC20 token = ERC20 token(projectMeta.getVTHAddr());
    require(token.transferFrom(msg.sender, address(this), value));

    // must be a valid milestone address
    require(projectMeta.isMilestone(milestoneAddr));
    Milestone milestone = Milestone(milestoneAddr);

    // update number of VTH staked by this address
    staked[msg.sender] += value;

    // calculate refund coverage
    uint RCInWei = ven.mVTHToWei(value);

    if(milestone.state() == IP) {
      // Staked VTH is effective (i.e. counted for refund coverage)
      RCByMilestone[milestoneAddr][msg.sender] += RCInWei;
    }
  }

  // TODO
  function withdrawVTH() {}
}
