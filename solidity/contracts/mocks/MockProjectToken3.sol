pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/StandardToken.sol";


contract MockProjectToken3 is StandardToken {
    string public constant name = "MockProjectToken3"; // solium-disable-line uppercase
    string public constant symbol = "MPT"; // solium-disable-line uppercase
    uint8 public constant decimals = 18; // solium-disable-line uppercase

    /**
     * @dev Constructor that gives msg.sender all of existing tokens.
     */
    constructor(uint initialSupply) public {
        totalSupply_ = initialSupply;
        balances[msg.sender] = initialSupply;
        emit Transfer(0x0, msg.sender, initialSupply);
    }
}
