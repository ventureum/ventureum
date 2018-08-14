pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";

import "../Module.sol";
import "./EtherCollectorStorage.sol";


contract EtherCollector is Module {
    using SafeMath for uint;

    // Storage contract
    EtherCollectorStorage public store;

    constructor (address kernelAddr) Module(kernelAddr) public {
        CI = keccak256("EtherCollector");
    }

    /*
     * Allow someone send ether to this contract
     */
    function () external payable {}

    /*
      Bind with a storage contract

      @param _store the address of a storage contract
     */
    function setStorage(address _store) public connected {
        super.setStorage(_store);
        store = EtherCollectorStorage(storeAddr);
    }

    /*
      Deposit ethers into the contract

    * @param key the key of a stored value
     */
    function deposit(bytes32 key) external payable connected {
        uint bal = store.getUint(key);
        bal = bal.add(msg.value);
        store.setUint(key, bal);
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
    * Transfer ether inside this contract
    *
    * @param from the key for from
    * @param to the key for to
    * @param val the value to transfer 
    */
    function insideTransfer(bytes32 from, bytes32 to, uint val) external connected {
        uint fromBal = store.getUint(from);
        uint toBal = store.getUint(to);
        require(fromBal >= val);

        fromBal = fromBal.sub(val);
        toBal = toBal.add(val);

        store.setUint(from, fromBal);
        store.setUint(to, toBal);
    }

    /*
      Withdraw ethers to a beneficiary

      @param key the key of a stored value
      @param beneficiary address of beneficiary
      @param val amount of wei to transfer
     */
    function withdraw(bytes32 key, address beneficiary, uint val) external connected {
        require(beneficiary != NULL);

        uint bal = store.getUint(key);
        require(val <= bal);
        bal = bal.sub(val);
        store.setUint(key, bal);

        beneficiary.transfer(val);
    }
}
