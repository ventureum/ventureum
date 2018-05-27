pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "../handlers/IContractAddressHandler.sol";
import "../handlers/IACLHandler.sol";
import '../kernel/Base.sol';

contract Module is Base, Ownable {

    address public storeAddr;

    IACLHandler public aclHandler;
    IContractAddressHandler public contractAddressHandler;

    function validate() internal {
        super.validate();
        bytes32 srcCI = contractAddressHandler.reverseLookUp(msg.sender);
        require(aclHandler.isAuthorized(srcCI, CI, msg.sig));
    }

    // functions called by Kernel

    function setHandler(bytes32 CI, address handlerAddr) public connected kernelOnly {
        super.setHandler(CI, handlerAddr);

        if (CI == keccak256("ACLHandler")) {
            aclHandler = IACLHandler(handlerAddr);
        }
        if (CI == keccak256("ContractAddressHandler")) {
            contractAddressHandler = IContractAddressHandler(handlerAddr);
        }
    }

    function setStorage(address _storeAddr) public onlyOwner {
        storeAddr = _storeAddr;
    }
}
