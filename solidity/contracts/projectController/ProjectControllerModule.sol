pragma solidity ^0.4.23;

import "../kernel/Module.sol";

contract ProjectControllerModule is Module {

    bytes32 constant CI = keccak256("ProjectControllerModule");

    enum State {
        AppSubmitted,
        AppAccepted,
        TokenSale,
        Milestone,
        Complete
    }

    constructor (address kernelAddr) Module(kernelAddr) public {}

    State public state;
    // namespace => owner address
    mapping(bytes32 => address) owners;

    // owner address => namespace
    mapping(address => bytes32) reverseLookUp;

    function registerOwner(bytes32 namespace, address owner) external connected {
        require(owners[namespace] == address(0x0));

        owners[namespace] = owner;
        reverseLookUp[owner] = namespace;
    }

    function moveToNextState() external connected {
        require(state != State.Complete);
        state = State(uint(state) + 1);
    }
}
