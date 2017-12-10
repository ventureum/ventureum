Contract Milestone is Ownable, States {

    // milestone name
    string public name;

    // parent milestone
    Milestone public parent;

    // number of weis locked in this milestone
    uint public weiLocked = 0;

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
    }

    VP2Info public _VP2Info;

    // whether VP2 has been initiated
    bool public VP2Initiated = false;

    Milestone(string _name) public {
        name = _name;
    }

    // set parent milestone, can only be done when state is INACTIVE
    function setParent(address parentAddr) public onlyOwner inState(INACTIVE) {
        parent = Milestone(parentAddr);
    }

    // set TTC (Time-to-completion) in days
    function setTTC(uint _TTC) public onlyOwner inState(INACTIVE) returns (bool) {
        TTC= _TTC;
    }

    // verify objectives hash
    function verifyObjectives(bytes32 _hash_obj) public inState(INACTIVE) returns (bool) {
        return hash_obj== _hash_obj;
    }

    // set objectives hash
    // Usage(js): let _hash_obj = '0x' + web3.sha3(text);
    function setObjectives(bytes32 _hash_obj) public onlyOwner inState(INACTIVE) returns (bool) {
        hash_obj = _hash_obj
            }

    // deposit ETH raised from a crowdsale by the project founder to this milestone
    function depositETHByProjectFounder() public payable onlyOwner inState(INACTIVE) {
        weiLocked += msg.value;
    }

    // withdraw ETH by the project founder from this milestone after the 
    // decision of releasing milestone payment is approved by the majority of
    // investors
    function withdrawETHByProjectFounder(address beneficiary) public onlyOwner inState(C) {

        uint weiToSend = weiLocked;
        weiLocked = 0;

        require(beneficiary.send(weiToSend));
    }

    // initialize VP2 while in VP1
    function initVP2(uint TTC, bytes32 hash_obj) public onlyOwner inState(VP1) {
        // can only be initiated once
        require(!VP2Initiated);
        VP2Initiated = true;

        _VP2Info.TTC = TTC;
        _VP2Info.hash_obj = hash_obj;
    }

    // finalize VP2
    function finalizeVP2 public onlyOwner inState(WVP2) {

        // new TTC must be longer than old TTC by 15 days
        require(_VP2Info.TTC >= TTC + 15);
        TTC = _VP2Info.TTC;

        // update objectives
        hash_obj== _VP2Info.hash_obj;

        deadlineUpdated = true;
    }
}
