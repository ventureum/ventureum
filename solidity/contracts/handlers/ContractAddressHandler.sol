pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "./Handler.sol";
import "./IContractAddressHandler.sol";

contract ContractAddressHandler is IContractAddressHandler, Handler, Ownable {

    // CI => contract address
    mapping (bytes32 => address) public contracts;

    // contract address => CI
    mapping (address => bytes32) public reverseLookUp;

    constructor (address kernelAddr) Handler(kernelAddr) public {
        CI = keccak256("ContractAddressHandler");
    }

    function contracts(bytes32 _CI) public returns (address) {
        return contracts[_CI];
    }

    function reverseLookUp(address addr) public returns (bytes32) {
        return reverseLookUp[addr];
    }

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
