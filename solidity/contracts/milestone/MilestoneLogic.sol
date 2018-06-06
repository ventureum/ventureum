pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import '../kernel/Module.sol';
import './MilestoneStorage.sol';


contract MilestoneLogic is Module {

    using SafeMath for uint;

    // Can only add state in order
    // Do not delete or rearrange states
    // If you want to depreciate a state, add comment
    enum MilestoneState {
        INACTIVE,
        IP, // In progress
        RS, // Rating stage , regulators rate for each objective
        RP, // Refund Period
        COMPLETION   // Completion
    }

    /*
        Fields Names for struct MilestoneData

        struct MilestoneData {
            uint id;
            uint startTime;
            uint endTime;

            //  the amount of wei locked in the milestone
            uint weiLocked;

            MilestoneState state;

            // list of objectives' IPFS hash
            bytes32[] objs;
        }
    */
    string constant ID = "id";
    string constant START_TIME = "startTime";
    string constant END_TIME = "endTime";
    string constant WEI_LOCKED = "weiLocked";
    string constant STATE = "state";
    string constant OBJS = "objs";
    string constant NUMBER_MILESTONES = "numberMilestones";

    MilestoneStorage public milestoneStore;

    constructor (address kernelAddr) Module(kernelAddr) public {
        CI = keccak256("MilestoneLogic");
    }

    /**
    * Add a milestone
    * Can only be called if the first milestone is INACTIVE or there is no milestones
    * If it is the first milestone to be added, set state to "INACTIVE" and endTime to
    * now + length. The first milestone always releases funds to project founders.
    *
    * @param namespace namespace of a project
    * @param length length of the milestone, >= 60 days
    * @param objs list of objectives' IPFS hash
    */
    function addMilestone(bytes32 namespace, uint length, bytes32[] objs) external {
        require(length >= 60 days);

        uint numberMilestones = milestoneStore.getUint(
            keccak256(abi.encodePacked(namespace, NUMBER_MILESTONES)));

        uint firstMilestoneState;
        if (numberMilestones > 0) {
            firstMilestoneState = milestoneStore.getUint(
                keccak256(abi.encodePacked(namespace, uint(0), STATE)));
        }
        require(numberMilestones == 0 || firstMilestoneState == uint(MilestoneState.INACTIVE));

        uint lastEndTime = numberMilestones == 0 ? now :
            milestoneStore.getUint(
                keccak256(abi.encodePacked(namespace, numberMilestones.sub(1), END_TIME)));

        uint id = numberMilestones;
        bool existing;
        (existing,) = isExisting(namespace, id);
        require(!existing);

        milestoneStore.setUint(
            keccak256(abi.encodePacked(namespace, id, ID)), id);
        milestoneStore.setUint(
            keccak256(abi.encodePacked(namespace, id, START_TIME)), lastEndTime);
        milestoneStore.setUint(
            keccak256(abi.encodePacked(namespace, id, END_TIME)), lastEndTime.add(length));
        milestoneStore.setUint(
            keccak256(abi.encodePacked(namespace, id, STATE)), uint(MilestoneState.INACTIVE));
        milestoneStore.setArray(
            keccak256(abi.encodePacked(namespace, id, OBJS)), objs);
    }

    /**
    * Activate a milestone
    * First check if the previous milestone can be set to state "COMPLETION" using
    *   require(finalize(namespace, id));
    * Then activate this milestone
    *
    * @param namespace namespace of a project
    * @param id id of a milestone of the project
    * @param weiLocked the amount of wei locked in the milestone
    */
    function activate(bytes32 namespace, uint id, uint weiLocked) external {
        bool existing;
        uint endTime;
        (existing, endTime) = isExisting(namespace, id);
        require(existing);
        require(id == 0 || finalize(namespace, id.sub(1)));

        milestoneStore.setUint(
            keccak256(abi.encodePacked(namespace, id, STATE)), uint(MilestoneState.IP));
        milestoneStore.setUint(
            keccak256(abi.encodePacked(namespace, id, WEI_LOCKED)), weiLocked);
    }

    /**
    * Start rating stage (RS)
    * RS can be started by project founders at any time between startTime and endTime - 30 days.
    * Set state to "RS",  call module
    *      RegulatingRatingModule.start(namespace, id, objs, now, endTime - 30 days);
    *
    *  #TODO(david.shao):  add founderOnly modifier
    *  @param namespace namespace of a project
    *  @param id id of a milestone of the project
    */
    function startRatingStage(bytes32 namespace, uint id) external {
        bool existing;
        uint endTime;
        (existing, endTime) = isExisting(namespace, id);
        require(existing);

        uint startTime = milestoneStore.getUint(
            keccak256(abi.encodePacked(namespace, id, START_TIME)));
        require(now >= startTime && now <= endTime.sub(30 days));

        milestoneStore.setUint(
            keccak256(abi.encodePacked(namespace, id, STATE)), uint(MilestoneState.RS));

        // TODO(david.shao): add the following code after RegulatingRatingModule is added
        //      regulatingRatingModule.start(namespace, id, objs, now, endTime.sub(30 days))
    }

    /**
    * Start a refund
    * Can be called at anytime between [endTime - 1 week, endTime) by any address
    * Set state to "RP"
    *
    * @param namespace namespace of a project
    * @param id id of a milestone of the project
    */
    function startRefundStage(bytes32 namespace, uint id) external {
        bool existing;
        uint endTime;
        (existing, endTime) = isExisting(namespace, id);
        require(existing);
        require(now >= endTime.sub(1 weeks) && now < endTime);

        milestoneStore.setUint(
            keccak256(abi.encodePacked(namespace, id, STATE)), uint(MilestoneState.RP));
    }

    /**
    * Returns the current state, convert enum to uint
    *
    * @param namespace namespace of a project
    * @param id id of a milestone of the project
    */
    function milestoneState(bytes32 namespace, uint id) public view returns (uint) {
        bool existing;
        (existing, ) = isExisting(namespace, id);
        require(existing);
        return milestoneStore.getUint(
            keccak256(abi.encodePacked(namespace, id, STATE)));
    }

    /**
    * Bind with a storage contract
    * Create a new storage contract if _store == 0x0
    *
    * @param store the address of a storage contract
    */
    function setStorage(address store) public connected {
        super.setStorage(store);
        milestoneStore = MilestoneStorage(storeAddr);
    }

    /**
    * Return true and set the milestone's state to "COMPLETION"
    *     if a milestone is finalizable (now >= milestone's endTime)
    *
    * @param namespace namespace of a project
    * @param id id of a milestone of the project
    */
    function finalize(bytes32 namespace, uint id) internal returns (bool) {
        bool existing;
        uint endTime;
        (existing, endTime) = isExisting(namespace, id);
        require(existing);
        if (now >= endTime) {
            milestoneStore.setUint(
                keccak256(abi.encodePacked(namespace, id, STATE)),
                uint(MilestoneState.COMPLETION));
            return true;
        }
        return false;
    }

    /**
    * Return true and the endTime if the milestone exists
    *
    * @param namespace namespace of a project
    * @param id id of a milestone of the project
    */
    function isExisting(bytes32 namespace, uint id) internal view returns (bool, uint) {
        uint endTime = milestoneStore.getUint(
            keccak256(abi.encodePacked(namespace, id, END_TIME)));
        return endTime != 0 ? (true, endTime) : (false, 0);
    }
}
