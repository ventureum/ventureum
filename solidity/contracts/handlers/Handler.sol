pragma solidity ^0.4.24;

import "./IHandler.sol";
import "../base/Base.sol";


contract Handler is IHandler, Base {
    
    constructor (address kernelAddr) Base(kernelAddr) public {}
    
}
