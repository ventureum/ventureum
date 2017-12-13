Contract ProjectMeta is Ownable, States {

    // project name
    string public name;

    RefundManager public refundManager;

    // milestone list
    Milestone[] public milestones;

    // check if an address is a milestone address
    // of this project
    mapping(address => bool) isMilestone;

    Ballot public ballot;

    // Class A project token contract
    ERC20 public token;

    // Class A token average crowdsale price in wei
    uint public price;

    function ProjectMeta(string _name) public {
        name = _name;
    }

    function setRefundManager(address addr) external {
        refundManager = RefundManager(addr);
    }

    function setMilestones(address[] addrList) external {
        for(uint i=0; i < addrList.length; i++) {
            milestones.push(Milestone[addrList[i]]);
            isMilestone[addrList[i]] = true;
        }
    }

    function setBallot(address addr) external {
        ballot = Ballot(addr);
    }

    function setToken(address addr) external {
        token = ERC20(addr);
    }

    // returns true only if all milestones are in a terminal state
    function completed() external returns (bool) {
        for(uint i=0; i < milestones.length; i++) {
            uint8 _state = milestones[i].state();
            if(_state != RP && _state!= C) {
                return false;
            }
        }
        return true;
    }

    function setTokenPrice(uint _price) external {
        price = _price;
    }

    // token value in wei
    function tokenToWei(uint tokens) external view returns (uint) {
        return tokens * price;
    }
}
