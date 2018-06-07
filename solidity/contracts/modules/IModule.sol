pragma solidity ^0.4.24;

import "../base/IBase.sol";


contract IModule is IBase {
    function setHandler(bytes32 CI, address handlerAddr) public;
    function setStorage(address _storeAddr) public;
}
