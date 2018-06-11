pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";

import "../Module.sol";
import "./EtherCollectorStorage.sol";


contract EtherCollector is Module {
    using SafeMath for uint;

    bytes32 constant balanceHash = keccak256("balance");
    // Storage contract
    EtherCollectorStorage public store;

    constructor (address kernelAddr) Module(kernelAddr) public {
        CI = keccak256("EtherCollector");
    }

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
     */
    function deposit() external payable connected {
        uint bal = store.getUint(balanceHash);
        bal = bal.add(msg.value);
        store.setUint(balanceHash, bal);
    }

    /*
      Withdraw ethers to a beneficiary

      @param beneficiary address of beneficiary
      @param val amount of wei to transfer
     */
    function withdraw(address beneficiary, uint val) external connected {
        uint bal = store.getUint(balanceHash);
        require(val <= bal);
        bal = bal.sub(val);
        store.setUint(balanceHash, bal);

        beneficiary.transfer(val);
    }
}
