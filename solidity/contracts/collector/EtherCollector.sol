pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import '../kernel/Module.sol';
import './EtherCollectorStorage.sol';

contract EtherCollector is Module {

    using SafeMath for uint;

    uint public balance;

    bytes32 constant balanceHash = keccak256("balance");
    bytes32 constant CI = keccak256("EtherCollector");
    // Storage contract
    EtherCollectorStorage public store;

    constructor (address kernelAddr) Module(kernelAddr) public {}

    /*
      Bind with a storage contract

      @param _store the address of a storage contract

      Create a new storage contract if _store == 0x0
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
        bal = balance.add(msg.value);
        store.setUint(balanceHash, bal);
    }

    /*
      Withdraw ethers to a beneficiary

      @param beneficiary address of beneficiary
      @param val amount of wei to transfer
     */
    function withdraw(address beneficiary, uint val) external connected {
        uint bal = store.getUint(balanceHash);
        bal = balance.sub(val);
        store.setUint(balanceHash, bal);

        beneficiary.transfer(val);
    }
}
