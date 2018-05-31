pragma solidity ^0.4.23;

import '../kernel/Module.sol';

contract MilestoneStorage is Module {
    // Storage Types
    mapping(bytes32 => uint256) private uIntStorage;
    mapping(bytes32 => bytes32[]) private arrayStorage;

    constructor (address kernelAddr) Module(kernelAddr) public {
        CI = keccak256("MilestoneStorage");
    }

    /**
     * Set key and value paris of uint type
     *
     * @param _key the key for the uint record
     * @param _value the uint value for the uint record
     */
    function setUint(bytes32 _key, uint _value) external connected {
        uIntStorage[_key] = _value;
    }

    /**
     * Set key and value paris of array type
     *
     * @param _key the key for the array record
     * @param _value the array value for the array record
     */
    function setArray(bytes32 _key, bytes32[] _value) external connected {
        arrayStorage[_key] = _value;
    }

    /**
     * Get value from uint records by key
     *
     * @param _key the key for the uint record
     */
    function getUint(bytes32 _key) external view returns (uint) {
        return uIntStorage[_key];
    }

    /**
     * Get value from array records by key
     *
     * @param _key the key for the array record
     */
    function getArray(bytes32 _key) external view returns (bytes32[]) {
        bytes32[] storage value =  arrayStorage[_key];
        bytes32[] memory result = new bytes32[] (value.length);
        for (uint i = 0; i < value.length; i++) {
            result[i] = value[i];
        }
        return result;
    }
}
