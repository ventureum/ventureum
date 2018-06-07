pragma solidity ^0.4.0;

import '../../storage/Storage.sol';


contract PaymentManagerStorage is Storage {
    constructor (address kernelAddr) Storage(kernelAddr) public {
        CI = keccak256("PaymentManagerStorage");
    }
}
