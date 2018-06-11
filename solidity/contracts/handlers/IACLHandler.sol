pragma solidity ^0.4.24;

import "./IHandler.sol";


contract IACLHandler is IHandler {
    function isAuthorized(bytes32 srcCI, bytes32 dstCI, bytes4 sig) public view returns(bool);
    function permit(bytes32 srcCI, bytes32 dstCI, bytes32[] sigs) public;
    function forbid(bytes32 srcCI, bytes32 dstCI, bytes32[] sigs) public;
}
