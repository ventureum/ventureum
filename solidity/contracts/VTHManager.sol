pragma solidity ^0.4.18;

import './Ownable.sol';
import './ProjectMetaWithVTH.sol';
import './States.sol';
import './Ventureum.sol';
import './Milestones.sol';
import './ERC20.sol';

contract VTHManager is Ownable, States {

    // Ventureum Contract
    Ventureum public ven;

    // project meta info
    ProjectMetaWithVTH public projectMeta;

    // number of VTH tokens staked by investors
    mapping(address => uint) staked;

    struct RC {
        // RC of the subtree starting at this milestone
        uint subtree;
        // RC of this milestone
        uint vertex;
    }

    // milestone => investor address => refund coverage
    mapping(uint8 => mapping(address => RC)) public RCByMilestone;

    function stakeVTH(uint8 id, uint value) external returns (uint) {
        /** In order to transfer tokens owned by someone else, we need to do it in
         * two steps:
         * 1. Investor call token.approve(milestoneAddr, value) from web3
         * 2. Transfer funds from the investor to this contract using transferFrom()
         */
        ERC20 token = projectMeta.ven().VTHToken();
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
                curr = milestones.getParent(curr);
            }
        }

        return RCInWei;
    }

    function withdrawVTH() external {
        Milestones milestones = projectMeta.milestones();

        // project must have been completed
        require(milestones.completed());

        // right now, continuous withdraw is not supported
        ERC20 vth = ERC20(ven.VTHToken());
        uint _stakedVTH = staked[msg.sender];
        staked[msg.sender] = 0;
        vth.transfer(msg.sender, _stakedVTH);
    }

    // transfer remaining RC of a milestone to another milestone
    function transferRC(uint8 from, uint8 to, uint value) external {
        // both must be valid milestone IDs
        Milestones milestones = projectMeta.milestones();
        require(milestones.valid(from));
        require(milestones.valid(to));

        // both must be in valid states
        require(milestones.state(from) == IP);
        require(milestones.state(to) == IP);

        // now transfer RC
        require(value <= RCByMilestone[from][msg.sender].vertex);

        RCByMilestone[from][msg.sender].vertex -= value;
        RCByMilestone[to][msg.sender].vertex += value;

        // update all ancestors
        uint8 curr = from;
        while(true) {
            RCByMilestone[curr][msg.sender].subtree -= value;
            if(curr != 0){
                curr = milestones.getParent(curr);
            }
        }

        curr = to;
        while(true) {
            RCByMilestone[curr][msg.sender].subtree += value;
            if(curr != 0){
                curr = milestones.getParent(curr);
            }
        }
    }
}
