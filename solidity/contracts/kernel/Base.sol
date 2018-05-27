pragma solidity ^0.4.23;

import './IBase.sol';
import './IKernel.sol';

contract Base is IBase {

    enum Status {
        New,
        Connected,
        Disconnected
    }

    bytes32 public CI;

    // status of the contract
    Status public status;

    // Kernel address
    IKernel public kernel;

    // CI => Handler address
    mapping(bytes32 => address) public handlers;

    constructor(address kernelAddr) public {
        kernel = IKernel(kernelAddr);
        status = Status.New;
    }

    /*
      Check if the contract is connected to a kernel
     */
    modifier connected() {
        validate();
        _;
    }

    modifier kernelOnly() {
        require(msg.sender == address(kernel));
        _;
    }

    function isConnected() public returns (bool) {
        return status == Status.Connected;
    }
    /*
      Check if a function call is valid, Use super to concatenate validations
     */
    function validate() internal {
        require(isConnected());
    }

    // functions called by Kernel

    /*
      Connect to kernel
     */
    function connect() external kernelOnly {
        require(status == Status.New);
        status = Status.Connected;
    }

    /*
      Disconnect kernel
     */
    function disconnect() external kernelOnly {
        require(status != Status.New && status != Status.Disconnected );
        status = Status.Disconnected;
    }

    function setHandler(bytes32 _CI, address handlerAddr) public connected kernelOnly {
        handlers[_CI] = handlerAddr;
    }
}
