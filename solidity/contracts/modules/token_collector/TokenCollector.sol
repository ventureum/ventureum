pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

import "../Module.sol";


contract TokenCollector is Module {

    address constant NULL = address(0x0);

    constructor (address kernelAddr) Module(kernelAddr) public {
        CI = keccak256("TokenCollector");
    }

    /*
     * Return the balance of the given token
     *
     * @param token the address of token
     * @return balance of the given token
     */
    function balanceOf(address token) external view returns (uint) {
        require(token != NULL);
        return ERC20(token).balanceOf(this);
    }

    /**
     * withdraw amount of token to beneficiary
     *
     * @param token the address of token
     * @param beneficiary the address of the beneficiary
     * @param val the amount of token will withdraw
     */
    function withdraw(address token, address beneficiary, uint val) external connected {
        require(token != NULL && beneficiary != NULL);
        require(ERC20(token).balanceOf(this) >= val);
        ERC20(token).transfer(beneficiary, val);
    }

    /**
     * deposit amount of token 
     *
     * @param token the address of token
     * @param val the amount of token will deposit
     */
    function deposit(address token, uint val) external connected {
        require(token != NULL);
        ERC20(token).transferFrom(msg.sender, this, val);
    }
}
