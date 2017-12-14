Contract Milestones is Ownable, States {

    // project meta info
    ProjectMeta public projectMeta;

    struct WeiLocked {
        uint subtree;
        uint vertex;
    }

    modifier inState(uint8 id, uint8 _state) {
        require(_state == state(id));
        _;
    }

    struct VP2Info {
        // tentative new time-to-completion and/or a tentative new objectives
        // tentative ttc and objectives become the milestone's ttc and objectives once VP2 gets approved
        uint TTC;
        bytes32 hash_obj;
        uint deadline;
    }

    struct Milestone {
        // milestone name
        string name;

        // TTC (Time-to-completion) in days
        uint TTC;

        // objectives hash
        // Usage(js): let _hash_obj = '0x' + web3.sha3(text);
        bytes32 hash_obj;

        // parent milestone
        uint8 parent

        // whether VP2 has been initiated
        bool VP2Initiated;

        // deadline of the milestone
        uint deadline;

        // number of weis locked in this milestone
        WeiLocked weiLocked;
        VP2Info _VP2Info;
    }

    // milestones
    Milestone[] m;

    function addMilestone(string _name, uint _TTC, bytes32 _hash_obj) public {
        m.push(Milestone({name:_name,TTC:_TTC,hash_obj: _hash_obj}));
    }

    // set parent milestone, can only be done when state is INACTIVE
    function setParent(uint8 id, uint8 parent) public onlyOwner inState(id, INACTIVE) {
        require(valid(id));
        m[id].parent = parent;
    }

    // verify objectives hash
    function verifyObjectives(uint8 id, bytes32 _hash_obj) public inState(id, INACTIVE) returns (bool) {
        require(valid(id));
        return m[id].hash_obj== _hash_obj;
    }

    // deposit ETH raised from a crowdsale by the project founder to this milestone
    function depositETHByProjectFounder(uint8 id) public payable onlyOwner inState(id, INACTIVE) {
        require(valid(id));
        
        // update this vetex
        m[id].weiLocked.vertex += msg.value;

        // update all ancestors
        uint8 curr = m[id].parent;
        while(true) {
            m[curr].weiLocked.subtree += msg.value;
            if(curr == 0 ) break;
            curr = m[curr].parent;
        }
    }

    // withdraw ETH by the project founder from this milestone after the 
    // decision of releasing milestone payment is approved by the majority of
    // investors
    function withdrawETHByProjectFounder(uint8 id, address beneficiary) public onlyOwner inState(id, C) {

        require(valid(id));

        uint weiToSend = m[id].weiLocked.vertex;
        m[id].weiLocked.vertex = 0;

        require(beneficiary.send(weiToSend));
    }

    // initialize VP2 while in VP1
    function initVP2(uint8 id, uint TTC, bytes32 hash_obj) public onlyOwner inState(id, VP1) {
        require(valid(id));

        // can only be initiated once
        require(!m[id].VP2Initiated);
        m[id].VP2Initiated = true;
        m[id]._VP2Info.TTC = TTC;
        m[id]._VP2Info.hash_obj = hash_obj;
        m[id]._VP2Info.deadline = getDeadline(m[id].parent) + m[id]._VP2Info.TTC * 1 days;
    }

    function withdrawRefund(uint8 id) public {
        require(valid(id));

        RefundManager refundManager = projectMeta.refundManager();
        (uint8 preState, uint8 currState, uint8 nextState) = states(id);

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

        (uint subtree, uint vertex) = refundManager.refundAmount(id, msg.sender, stateForRefund);

        uint refund = 0;
        if(currState == RP) {
            // we consider the entire subtree in this case
            refund = subtree;
        } else if(currState == C) {
            // we consider the current vertex (milestone node)
            // in the previous voting, investor who voted for a refund will
            // receive a refund
            if(!ballot.hasApproved(id, msg.sender, preState)) {
                refund = vertex;
            }
        }

        // transfer refund to the investor
        refundManager.clear(id, msg.sender, stateForRefund);
        require(msg.sender.transfer(refund));
    }

    // returns true only if all milestones are in a terminal state
    function completed() external returns (bool) {
        for(uint i=0; i < m.length; i++) {
            uint8 _state = state(i);
            if(_state != RP && _state!= C) {
                return false;
            }
        }
        return true;
    }

    // returns true if id is a valid milestone id
    function valid(uint8 id) public returns (bool) {
        return (id < m.length);
    }
}
