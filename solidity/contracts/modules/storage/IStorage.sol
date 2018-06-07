pragma solidity ^0.4.24;

import '../IModule.sol';


contract IStorage is IModule {
    /**
     * Set key and value paris of uint type
     *
     * @param _key the key for the uint record
     * @param _value the uint value for the uint record
     */
    function setUint(bytes32 _key, uint256 _value) external;

    /**
     * Get value from uint records by key
     *
     * @param _key the key for the uint record
     */
    function getUint(bytes32 _key) external view returns (uint);

    /**
     * Set key and value paris of address type
     *
     * @param _key the key for the address record
     * @param _value the address value for the address record
     */
    function setAddress(bytes32 _key, address _value) external;

    /**
     * Get value from address records by key
     *
     * @param _key the key for the address record
     */
    function getAddress(bytes32 _key) external view returns (address);

    /**
     * Set key and value of bytes32 type
     *
     * @param _key the key for the bytes32 record
     * @param _value the bytes32 value for the bytes32 record
     */
    function setBytes32(bytes32 _key, bytes32 _value) external;

    /**
     * Get value from bytes32 records by key
     *
     * @param _key the key for the address record
     */
    function getBytes32(bytes32 _key) external view returns (bytes32);

    /**
     * Set key and value paris of array type
     *
     * @param _key the key for the array record
     * @param _value the array value for the array record
     */
    function setArray(bytes32 _key, bytes32[] _value) external;

    /**
     * Get value from array records by key
     *
     * @param _key the key for the array record
     */
    function getArray(bytes32 _key) external view returns (bytes32[]);
}
