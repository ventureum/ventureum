pragma solidity ^0.4.24;


interface IKernel {
    function handlers(bytes32 CI) external returns (address);
    function registerHandler(bytes32 CI, address handlerAddr) external;
    function unregisterHandler(bytes32 CI) external;
    function connect(address contractAddr, bytes32[] _handlers) external;
    function disconnect(address contractAddr, bytes32[] _handlers) external;
}
