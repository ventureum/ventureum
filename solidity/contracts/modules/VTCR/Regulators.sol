pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";


/*
   @title Regulators Controller
   @author Timothy Wang
*/
contract Regulators {

    // Events
    event Approve(address addr);
    event Disapprove(address addr);
    event RequestApproval(address addr, uint amount);
    event Withdraw(address addr, uint amount);
    event SetOwnership(address addr, bool val);

    using SafeMath for uint;

    // Anyone can be a member
    struct Member {
        // indicating if the member is a regulator
        bool isRegulator;

        // number of staked VTH tokens
        uint staked;
    }

    // the minimum number of staked VTH tokens required for regulators
    uint public minStakingAmount = 0;

    // address to member mapping
    mapping(address => Member) public members;

    // ERC20 Token
    ERC20 public token;

    // Owners of the contract, managed by the creator
    // Owners have the ability to add/remove regulators
    mapping(address => bool) public owners;

    // Creator of the contract
    address creator;

    // DEBUG option
    bool DEBUG;

    modifier onlyOwners() {
        require(owners[msg.sender]);
        _;
    }

    modifier onlyCreator() {
        require(creator == msg.sender);
        _;
    }

    constructor(address tokenAddr, bool _DEBUG) public {
        DEBUG = _DEBUG;
        token = ERC20(tokenAddr);
        owners[msg.sender] = true;
        creator = msg.sender;
    }

    /*
     * External functions
     */

    function isRegulator(address addr) external view returns (bool) {
        return members[addr].isRegulator;
    }

    function requestApproval(uint amount) external {
        require(token.transferFrom(msg.sender, this, amount));
        members[msg.sender].staked = amount;

        emit RequestApproval(msg.sender, amount);
    }

    function withdraw(uint amount) external {
        require(!members[msg.sender].isRegulator);
        require(members[msg.sender].staked >= amount);

        members[msg.sender].staked = SafeMath.sub(members[msg.sender].staked,amount);
        require(token.transfer(msg.sender, amount));

        emit Withdraw(msg.sender, amount);
    }

    function approve(address addr) onlyOwners external {
        require(members[addr].staked >= minStakingAmount);
        members[addr].isRegulator = true;

        emit Approve(addr);
    }

    function disapprove(address addr) onlyOwners external {
        require(members[msg.sender].isRegulator);
        members[addr].isRegulator = false;

        // Refund staked VTH
        require(token.transfer(addr, members[msg.sender].staked));

        emit Disapprove(addr);
    }

    function setOwnership(address addr, bool val) onlyCreator external {
        owners[addr] = val;

        emit SetOwnership(addr, val);
    }

    // DEBUG helpers
    // The following functions are not callable in prod version

    function DEBUG_approve(address addr) external {
        require(DEBUG);
        members[addr].isRegulator = true;
        emit Approve(addr);
    }

    function DEBUG_disapprove(address addr) external {
        require(DEBUG);
        members[addr].isRegulator = false;
        emit Approve(addr);
    }
}
