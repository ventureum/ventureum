pragma solidity ^0.4.23;

import './Ownable.sol';
import './ERC20.sol';

// Ventureum project meta contract
contract Ventureum is Ownable {

    // VTH token contract address
    ERC20 public VTHToken;

    // number of mVTH to cover 1 wei
    uint public exchangeRate;

    function setExchangeRate(uint _exchangeRate) external {
        exchangeRate = _exchangeRate;
    }

    /**
     * @param value number of mVTH
     * @return number of wei coveredtru
     */
    function mVTHToWei(uint value) external view returns (uint) {
        return value / exchangeRate;
    }

    function setVTHToken(address addr) external {
        VTHToken = ERC20(addr);
    }
}
