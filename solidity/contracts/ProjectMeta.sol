pragma solidity ^0.4.23;

import './Ownable.sol';

contract ProjectMeta is Ownable {

    // project name
    string public name;

    // Storage Types
    mapping(bytes32 => uint256) private uIntStorage;
    mapping(bytes32 => address) private addressStorage;
    mapping(bytes32 => mapping(address => bool)) _accessibleBy;

    /**
     * @param _key The key for the record
     * commonly used to store contract address
     * example usage: setAddress(keccak256("contract.name", contractName), contractAddress)
     */
    function setAddress(bytes32 _key, address _value) external onlyOwner {
        addressStorage[_key] = _value;
    }

    /**
     * @param _key The key for the record
     */
    function setUint(bytes32 _key, uint _value) external onlyOwner {
        uIntStorage[_key] = _value;
    }

    /**
     * @param _key The key for the record
     */
    function setAccessibleBy(bytes32 _key, address addr) external onlyOwner {
        _accessibleBy[_key][addr] = true;
    }

    /**
     * @param _key The key for the record
     */
    function getAddress(bytes32 _key) external view returns (address) {
        return addressStorage[_key];
    }

    /**
     * @param _key The key for the record
     */
    function getUint(bytes32 _key) external view returns (uint) {
        return uIntStorage[_key];
    }

    /**
     * @param _key The key for the record
     */
    function accessibleBy(bytes32 _key, address addr) external view returns (bool) {
        return _accessibleBy[_key][addr];
    }
}
