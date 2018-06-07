pragma solidity ^0.4.24;

import "./IBase.sol";
import "../kernel/IKernel.sol";


contract Base is IBase {
    enum Status {
        New,
        Connected,
        Disconnected
    }

    address constant NULL = address(0x0);

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

    function isConnected() public view returns (bool) {
        return status == Status.Connected;
    }

    function handlers(bytes32 _CI) external view returns (address) {
        return handlers[_CI];
    }


    function kernel() external view returns (address) {
        return kernel;
    }


    function status() external view returns (uint) {
        return uint(status);
    }


    function CI() external view returns (bytes32) {
        return CI;
    }

    /*
      Check if a function call is valid, Use super to concatenate validations
     */
    function validate() internal view{
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

    function setHandler(bytes32 _CI, address handlerAddr) public kernelOnly {
        handlers[_CI] = handlerAddr;
    }
}
