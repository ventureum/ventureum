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

    RewardManagerStorage private rewardManagerStore;

    bytes32 constant public ALREADY_WITHDRAWN = "alreadyWithdrawn";
    uint constant public TRUE = 1;
    uint constant public FALSE = 0;

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
        bytes32 alreadyWithdrawnKey = keccak256(abi.encodePacked(
            namespace,
            milestoneId,
            obj,
            msg.sender,
            ALREADY_WITHDRAWN));

        // require msg.sender never withdraw for this obj
        require(rewardManagerStore.getUint(alreadyWithdrawnKey) == FALSE);

        // check milestone regulation finalized and rewards greater than 0
        (bool finalized, uint rewards) = milestoneController.getRegulationRewardsForRegulator(
            namespace,
            milestoneId,
            obj,
            msg.sender
        );
        require(finalized);
        require(rewards > 0);

        // set the already store to true
        rewardManagerStore.setUint(alreadyWithdrawnKey, TRUE);

        // withdraw rewards
        bytes32 withdrawKey = keccak256(abi.encodePacked(
            namespace,
            milestoneId,
            MILESTONE_MAX_REWARDS));
        etherCollector.withdraw(withdrawKey, msg.sender, rewards);

        emit RegulationRewardsWithdrawn(msg.sender, namespace, milestoneId, obj);
    }

    function setStorage(address store) public connected {
        super.setStorage(store);
        rewardManagerStore = RewardManagerStorage(store);
    }
}
