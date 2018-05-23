pragma solidity ^0.4.20;

import "./Ownable.sol";

contract VentureumVerifiedMilestoneContractAddresses is Ownable {

    address public owner;
    mapping(address => bool) public VerifiedMilestoneContractAddresses;

    function isVerifiedMilestoneContractAddress(address addr) public view returns (bool) {
        require( msg.sender != address(0x0) );
        return VerifiedMilestoneContractAddresses[addr];
    }

    function addVerifiedMilestoneContractAddress(address addr) public onlyOwner {
        require( msg.sender != address(0x0) );
        VerifiedMilestoneContractAddresses[addr] = true;
    }

    function removeVerifiedMilestoneContractAddress(address addr) public onlyOwner {
        require( msg.sender != address(0x0) );
        VerifiedMilestoneContractAddresses[addr] = false;
    }

}
