pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "./Handler.sol";
import "./IContractAddressHandler.sol";

contract ContractAddressHandler is IContractAddressHandler, Handler, Ownable {

    bytes32 constant CI = keccak256("ContractAddressHandler");

    // CI => contract address
    mapping (bytes32 => address) public contracts;

    // contract address => CI
    mapping (address => bytes32) public reverseLookUp;

    /*
      Register a contract

      @param CI Contract Identifier (CI)
      @param addr address of the contract
    */
    function registerContract(bytes32 _CI, address addr) external onlyOwner {
        require(contracts[_CI] == address(0x0));

        contracts[_CI] = addr;
        reverseLookUp[addr] = _CI;
    }

    /*
      Unregister a contract

      @param CI Contract Identifier (CI)
    */
    function unregisterContract(bytes32 _CI) external onlyOwner {
        require(contracts[_CI] != address(0x0));

        delete reverseLookUp[contracts[_CI]];
        delete contracts[_CI];

        // TODO notify
    }


}
