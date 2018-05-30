pragma solidity ^0.4.23;

interface IBase {
    function CI() external returns (bytes32);
    function status() external returns (uint);
    function kernel() external returns (address);
    function handlers(bytes32 _CI) external returns (address);
    function isConnected() external returns (bool);
    function connect() external;
    function disconnect() external;
    function setHandler(bytes32 _CI, address handlerAddr) public;
}
