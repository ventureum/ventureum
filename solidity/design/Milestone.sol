Contract Milestone is Ownable, States {

    // milestone name
    string public name;

    // parent milestone
    Milestone public parent;

    struct WeiLocked {
        uint subtree;
        uint vertex;
    }

    // number of weis locked in this milestone
    Weilocked public weiLocked;

    // project meta info
    ProjectMeta public projectMeta;

    modifier inState(uint8 _state) {
        require(_state == state());
        _;
    }

    struct VP2Info {
        // tentative new time-to-completion and/or a tentative new objectives
        // tentative ttc and objectives become the milestone's ttc and objectives once VP2 gets approved
        uint TTC;
        bytes32 hash_obj;
        uint deadline;
    }

    VP2Info public _VP2Info;

    // whether VP2 has been initiated
    bool public VP2Initiated = false;

    Milestone(string _name, uint _TTC, bytes32 _hash_obj) public {
        name = _name;

        // set TTC (Time-to-completion) in days
        TTC= _TTC;

        // set objectives hash
        // Usage(js): let _hash_obj = '0x' + web3.sha3(text);
        hash_obj = _hash_obj;
    }

    // set parent milestone, can only be done when state is INACTIVE
    function setParent(address parentAddr) public onlyOwner inState(INACTIVE) {
        parent = Milestone(parentAddr);
    }

    // verify objectives hash
    function verifyObjectives(bytes32 _hash_obj) public inState(INACTIVE) returns (bool) {
        return hash_obj== _hash_obj;
    }

    // deposit ETH raised from a crowdsale by the project founder to this milestone
    function depositETHByProjectFounder() public payable onlyOwner inState(INACTIVE) {
        // update this vetex
        weiLocked.vertex += msg.value;

        // update all ancestors
        Milestone milestone = parent;
        while(address(milestone) != address(0x0)) {
            milestone.weiLocked.subtree += msg.value;
            milestone = milestone.parent();
        }
    }

    // withdraw ETH by the project founder from this milestone after the 
    // decision of releasing milestone payment is approved by the majority of
    // investors
    function withdrawETHByProjectFounder(address beneficiary) public onlyOwner inState(C) {

        uint weiToSend = weiLocked.vertex;
        weiLocked.vertex = 0;

        require(beneficiary.send(weiToSend));
    }

    // initialize VP2 while in VP1
    function initVP2(uint TTC, bytes32 hash_obj) public onlyOwner inState(VP1) {
        // can only be initiated once
        require(!VP2Initiated);
        VP2Initiated = true;

        _VP2Info.TTC = TTC;
        _VP2Info.hash_obj = hash_obj;
        _VP2Info.deadline = parent.getDeadline() + _VP2Info.TTC * 1 days;
    }

    function withdrawRefund() public {
        RefundManager refundManager = projectMeta.refundManager();
        (uint8 preState, uint8 currState, uint8 nextState) = states();

        // must be at a valid state
        require(currState == RP || currState == C);

        uint8 stateForRefund;
        if(preState == VP1 || preState == VP2) {
            // we use tokens staked at VP1 for calculating refunds
            stateForRefund = VP1;
        } else if(preState == VP1_AFTER_VP2) {
            // we use tokens staked at VP1_AFTER_VP2 for calculating refunds
            stateForRefund = VP1_AFTER_VP2;
        } else {
            // this should not happen
            throw;
        }

        (uint subtree, uint vertex) = refundManager.refundAmount(address(this), msg.sender, stateForRefund);

        uint refund = 0;
        if(currState == RP) {
            // we consider the entire subtree in this case
            refund = subtree;
        } else if(currState == C) {
            // we consider the current vertex (milestone node)
            // in the previous voting, investor who voted for a refund will
            // receive a refund
            if(!ballot.hasApproved(address(this), msg.sender, preState)) {
                refund = vertex;
            }
        }

        // transfer refund to the investor
        refundManager.clear(address(this), msg.sender, stateForRefund);
        require(msg.sender.transfer(refund));
    }
}
