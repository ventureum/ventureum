pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";

import "../IModule.sol";


contract IManager is IModule {
    function setController(bytes32 CI, address handlerAddr) public;
}
