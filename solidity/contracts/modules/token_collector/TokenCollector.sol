pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

import "../Module.sol";
import "./TokenCollectorStorage.sol";


contract TokenCollector is Module {
    using SafeMath for uint;

    TokenCollectorStorage public store;

    constructor (address kernelAddr) Module(kernelAddr) public {
        CI = keccak256("TokenCollector");
    }

    /**
    * Bind with a storage contract
    *
    * @param _store the address of a storage contract 
    */
    function setStorage(address _store) public connected {
        super.setStorage(_store);
        store = TokenCollectorStorage(_store);
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
     * deposit amount of token 
     *
     * @param key the key of a stored value
     * @param token the address of token
     * @param val the amount of token will deposit
     */
    function deposit(bytes32 key, address token, uint val) external connected {
        uint bal = store.getUint(key);
        bal = bal.add(val);
        store.setUint(key, val);

        ERC20(token).transferFrom(msg.sender, this, val);
    }

    /**
    * get deposit info
    * 
    * @param key the key of a stored value
    */
    function getDepositValue(bytes32 key) public view returns(uint) {
        return store.getUint(key);
    }

    /**
     * withdraw amount of token to beneficiary
     *
     * @param key the key of a stored value
     * @param token the address of token
     * @param beneficiary the address of the beneficiary
     * @param val the amount of token will withdraw
     */
    function withdraw(bytes32 key, address token, address beneficiary, uint val) 
        external 
        connected 
    {
        require(beneficiary != NULL);

        uint bal = store.getUint(key);
        require(bal >= val);
        bal = bal.sub(val);
        store.setUint(key, val);

        ERC20(token).transfer(beneficiary, val);
    }

}
