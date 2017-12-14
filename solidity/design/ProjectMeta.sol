Contract ProjectMeta is Ownable, States {

    // project name
    string public name;

    RefundManager public refundManager;

    // milestones
    Milestones public milestones;

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

    function setMilestones(address addr) external {
        milestones = Milestones(addr);
    }

    function setBallot(address addr) external {
        ballot = Ballot(addr);
    }

    function setToken(address addr) external {
        token = ERC20(addr);
    }

    function setTokenPrice(uint _price) external {
        price = _price;
    }

    // token value in wei
    function tokenToWei(uint tokens) external view returns (uint) {
        return tokens * price;
    }
}
