pragma solidity ^0.4.24;

import "../modules/Module.sol";


contract MockedProjectController is Module {
    enum State {
        NotExist,
        AppSubmitted,
        AppAccepted,
        TokenSale,
        Milestone,
        Complete,
        LENGTH
    }

    constructor (address kernelAddr) Module(kernelAddr) public {
        CI = keccak256("MockedProjectController");
    }

    State public state;

    // namespace => owner address
    mapping(bytes32 => address) public owners;

    // owner address => namespace
    mapping(address => bytes32) public reverseLookUp;

    // namespace => State
    mapping(bytes32  => uint) public states;

    function registerOwner(bytes32 namespace, address owner) external connected {
        require(owners[namespace] == address(0x0));
        owners[namespace] = owner;
        reverseLookUp[owner] = namespace;
    }

    function setState(bytes32 namespace, uint _state) external connected {
        require(_state >= 0 && _state < uint(State.LENGTH));
        states[namespace] = _state;
    }
}
