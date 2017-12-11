Contract VTHManager is Ownable, States {

    // Ventureum Contract
    Ventureum public ven;

    // project meta info
    ProjectMeta public projectMeta;

    // Ventureum contract, this must be set in the constructor VTHManager()
    Ventureum public _Ventureum;

    // number of VTH tokens staked
    mapping(address => uint) staked;

    // milestone => investor address => refund coverage
    mapping(address => mapping(address => uint)) RCByMilestone;

    // VTH collected by the Ventureum team as fees
    unit public VTHOwnedByVentureum;


    function stakeVTH(address milestoneAddr, uint value) returns (uint) {

        require( msg.sender != address(0x0) );  

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
        staked[msg.sender] += value*0.99;

        // update number of VTH collected by the Ventureum team as fees
        VTHOwnedByVentureum += value*0.01;

        // calculate refund coverage
        uint RCInWei = ven.mVTHToWei(value);

        RCByMilestone[milestoneAddr][msg.sender] += RCInWei;
        return RCInWei;
    }

    function withdrawVTH() returns (bool) {

        require( msg.sender != address(0x0) );

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

        require( msg.sender != address(0x0) );  

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

    // withdraw 1% VTH tokens as fees by the Ventureum team
    function withdrawVTHByVentureum() returns (bool) {

        require( msg.sender != address(0x0) );  

        // project must have been completed
        require(projectMeta.completed());

        // must be invoked by the Ventureum team 
        require(msg.sender == _Ventureum.VentureumVTHAddr());

        VTHOwnedByVentureum = 0;

        ERC20 vth = ERC20(ven.getVTHAddr());
        require(vth.transfer(msg.sender, VTHOwnedByVentureum));


        return true;
    }

    // allow investors to transfer staked VTH tokens to another project's milestone
    // the destination milestone must be in Ventureum Verified Milestone Contract Addresses
    function transferVTH(address milestoneAddr, address remoteProjectMeta, uint value) returns (bool) {

        require( msg.sender != address(0x0) );
        
        // project must have been completed
        require(projectMeta.completed());

        // the destination milestone must be in Ventureum Verified Milestone Contract Addresses
        VentureumVerifiedMilestoneContractAddresses VVMCA = VentureumVerifiedMilestoneContractAddresses(_Ventureum.VVMCA());
        require(VVMCA.isVerifiedMilestoneContractAddress(milestoneAddr)); //== true omitted

        // the transferring amount of VTH must be less or equal to the amount staked
        require(value <= staked[msg.sender]);

        Milestone destMilestone = Milestone(milestoneAddr);

        ProjectMeta RemoteProjectMeta = ProjectMeta(remoteProjectMeta);

        ERC20 vth = ERC20(ven.getVTHAddr());

        staked[msg.sender] -= value;

        vth.approve(RemoteProjectMeta().VTHManagerAddr(), value);


        return true;

    }    


}
