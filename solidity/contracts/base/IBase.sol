pragma solidity ^0.4.24;


interface IBase {
    function CI() external view returns (bytes32);
    function status() external view returns (uint);
    function kernel() external view returns (address);
    function handlers(bytes32 _CI) external view returns (address);
    function isConnected() external view returns (bool);
    function connect() external;
    function disconnect() external;
    function setHandler(bytes32 _CI, address handlerAddr) external;
}
