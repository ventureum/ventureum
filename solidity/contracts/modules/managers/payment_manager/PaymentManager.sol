pragma solidity ^0.4.24;

import "../Manager.sol";


contract PaymentManager is Manager {
    constructor (address kernelAddr)  Manager(kernelAddr) public {
        CI = keccak256("PaymentManager");
    }

    /**
    *  Release funds from a milestone to project founders
    *
    *  @param namespace namespace of the project]
    *  @param milestoneId the id of a milestone
    */
    function withdraw(bytes32 namespace, uint milestoneId) external founderOnly(namespace) {
        // TODO(DAVID.SHAO): add implementation later
    }
}
