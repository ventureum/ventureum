pragma solidity ^0.4.23;

import '../kernel/Module.sol';

contract EtherCollectorStorage is Module {

    bytes32 constant CI = keccak256("EtherCollectorStorage");

    // Storage Types
    mapping(bytes32 => uint256) private uIntStorage;

    constructor (address kernelAddr) Module(kernelAddr) public {}

    /**
     * @param _key The key for the record
     */
    function setUint(bytes32 _key, uint _value) external connected {
        uIntStorage[_key] = _value;
    }

    /**
     * @param _key The key for the record
     */
    function getUint(bytes32 _key) external view returns (uint) {
        return uIntStorage[_key];
    }
}
