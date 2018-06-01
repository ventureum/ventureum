pragma solidity ^0.4.24;

import "../kernel/Module.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

contract TokenCollectorModule is Module {

    constructor (address kernelAddr) Module(kernelAddr) public {
        CI = keccak256("TokenCollectorModule");
    }

    function balanceOf(address token) external view returns (uint) {
        require(token != 0x0);
        return ERC20(token).balanceOf(this);
    }


    function withdraw(address token, address beneficiary, uint val) external connected {
        require(token != 0x0 && beneficiary != 0x0 && ERC20(token).balanceOf(this) >= val);
        ERC20(token).transfer(beneficiary, val);
    }

    function deposit(address token, uint val) external connected {
        require(token != 0x0);
        ERC20(token).transferFrom(msg.sender, this, val);
    }
}
