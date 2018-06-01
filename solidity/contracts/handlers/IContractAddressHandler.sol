pragma solidity ^0.4.24;

import "./IHandler.sol";

contract IContractAddressHandler is IHandler {
    function contracts(bytes32 _CI) public returns (address);
    function reverseLookUp(address addr) public returns (bytes32);
    function registerContract(bytes32 _CI, address addr) external;
    function unregisterContract(bytes32 _CI) external;
}
