pragma solidity ^0.4.24;

import "../Manager.sol";
import "./PaymentManagerStorage.sol";


contract PaymentManager is Manager {
    // event
    event FundWithdrawnByFounder(
        address indexed sender,
        bytes32 namespace,
        uint milestoneId,
        uint weiLocked
    );

    PaymentManagerStorage public paymentManagerStore;

    constructor (address kernelAddr)  Manager(kernelAddr) public {
        CI = keccak256("PaymentManager");
    }

    /**
    *  Release funds from a milestone to project founders
    *  The milestone should be in COMPLETE state
    *
    *  @param namespace namespace of the project]
    *  @param milestoneId the id of a milestone
    */
    function withdraw(bytes32 namespace, uint milestoneId) external founderOnly(namespace) {
        require(etherCollector != NULL);
        // check milestone state
        uint milestoneState = milestoneController.milestoneState(namespace, milestoneId);
        require(milestoneState == uint(MilestoneController.MilestoneState.COMPLETION));

        // check wei locked in the milestone
        uint weiLocked = milestoneController.milestoneWeiLocked(namespace, milestoneId);
        require(weiLocked > 0);

        require(weiLocked <= address(etherCollector).balance);
        etherCollector.withdraw(msg.sender, weiLocked);
        emit FundWithdrawnByFounder(msg.sender, namespace, milestoneId, weiLocked);
    }

    /**
    * Bind with a storage contract
    * Create a new storage contract if _store == 0x0
    *
    * @param store the address of a storage contract
    */
    function setStorage(address store) public connected {
        super.setStorage(store);
        paymentManagerStore = PaymentManagerStorage(storeAddr);
    }
}
