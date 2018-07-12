pragma solidity ^0.4.24;

import "@ventureum/sale/solidity/contracts/Presale.sol";

import "@ventureum/kingston/contracts/kernel/Kernel.sol";
import "@ventureum/kingston/contracts/handlers/ContractAddressHandler.sol";
import "@ventureum/kingston/contracts/handlers/ACLHandler.sol";


contract Migrations {
    address public owner;
    uint public last_completed_migration;

    modifier restricted() {
        if (msg.sender == owner) _;
    }

    constructor() public {
        owner = msg.sender;
    }

    function setCompleted(uint completed) public restricted {
        last_completed_migration = completed;
    }

    function upgrade(address new_address) public restricted {
        Migrations upgraded = Migrations(new_address);
        upgraded.setCompleted(last_completed_migration);
    }
}
