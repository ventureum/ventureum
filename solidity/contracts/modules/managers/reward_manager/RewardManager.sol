pragma solidity ^0.4.24;

import "../Manager.sol";
import "./RewardManagerStorage.sol";


contract RewardManager is Manager {

    event RegulationRewardsWithdrawn(
        address indexed sender,
        bytes32 namespace,
        uint milestoneId,
        bytes32 obj
    );

    RewardManagerStorage private rewardManagerStorage;

    constructor (address kernelAddr) Manager(kernelAddr) public {
        CI = keccak256("RewardManager");
    }

    /*
     * Withdraw reward by regulator after Rating Stage of the milestone
     *
     * @param namespace namespace of the project
     * @param milestoneId id of a milestone
     * @param obj an objective of a milestone of the project
     */
    function withdraw(bytes32 namespace, uint milestoneId, bytes32 obj) external {
        require(address(milestoneController) != NULL);

        (bool finalized, uint rewards) = milestoneController.getRegulationRewardsForRegulator(
            namespace,
            milestoneId,
            obj,
            msg.sender
        );
        require(finalized && rewards > 0 && rewards <= address(etherCollector).balance);
        etherCollector.withdraw(msg.sender, rewards);
        milestoneController.updateRegulationRewardsForRegulator(
            namespace,
            milestoneId,
            obj,
            msg.sender,
            rewards
        );
        emit RegulationRewardsWithdrawn(msg.sender, namespace, milestoneId, obj);
    }

    function setStorage(address store) public connected {
        super.setStorage(store);
        rewardManagerStorage = RewardManagerStorage(store);
    }
}
