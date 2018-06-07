pragma solidity ^0.4.24;

import "../Module.sol";


contract Storage is Module {
    // Storage Types
    mapping(bytes32 => uint256) private uIntStorage;
    mapping(bytes32 => address) private addressStorage;
    mapping(bytes32 => bytes32) private bytes32Storage;
    mapping(bytes32 => bytes32[]) private arrayStorage;

    constructor (address kernelAddr) Module(kernelAddr) public {
        CI = keccak256("Storage");
    }

    /**
     * Set key and value paris of uint type
     *
     * @param _key the key for the uint record
     * @param _value the uint value for the uint record
     */
    function setUint(bytes32 _key, uint256 _value) external connected {
        uIntStorage[_key] = _value;
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
     * Set key and value paris of address type
     *
     * @param _key the key for the address record
     * @param _value the address value for the address record
     */
    function setAddress(bytes32 _key, address _value) external connected {
        addressStorage[_key] = _value;
    }

    /**
     * Get value from address records by key
     *
     * @param _key the key for the address record
     */
    function getAddress(bytes32 _key) external view returns (address) {
        return addressStorage[_key];
    }

    /**
     * Set key and value of bytes32 type
     *
     * @param _key the key for the bytes32 record
     * @param _value the bytes32 value for the bytes32 record
     */
    function setBytes32(bytes32 _key, bytes32 _value) external connected {
        bytes32Storage[_key] = _value;
    }

    /**
     * Get value from bytes32 records by key
     *
     * @param _key the key for the address record
     */
    function getBytes32(bytes32 _key) external view returns (bytes32) {
        return bytes32Storage[_key];
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
