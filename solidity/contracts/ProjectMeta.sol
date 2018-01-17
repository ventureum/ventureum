pragma solidity ^0.4.18;

import './SafeMath.sol';
import './Ownable.sol';
import './States.sol';
import './IRefundManager.sol';
import './ERC20.sol';
import './Ballot.sol';
import './IBallot.sol';
import './Milestones.sol';

contract ProjectMeta is Ownable, States {

    // project name
    string public name;

    IRefundManager public refundManager;

    // milestones
     Milestones public milestones;

    IBallot public ballot;

    // Class A project token contract
    ERC20 public token;

    // Class A token average crowdsale price in wei
    uint public price;

    function ProjectMeta(string _name) public {
        name = _name;
    }

    function setRefundManager(address addr) external {
        refundManager = IRefundManager(addr);
    }

    function setMilestones(address addr) external {
        milestones = Milestones(addr);
    }

    function setBallot(address addr) external {
        ballot = IBallot(addr);
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
