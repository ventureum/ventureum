pragma solidity ^0.4.18;

import './SafeMath.sol';
import './Ownable.sol';
import './States.sol';
import './ProjectMeta.sol';
import './IRefundManager.sol';
import './SafeMath.sol';
import './ICriteriaController.sol';

contract Milestones is Ownable, States {

    using SafeMath for uint;

    // project meta info
    ProjectMeta public projectMeta;

    struct Milestone {
        // milestone name
        string name;

        // parent milestone
        uint8 parent;

        // deadline of the milestone
        uint deadline;

        // number of weis locked in this milestone
        uint weiLocked;

        /**
         * Two options are provided for distributing funds
         *
         * 1. Exact numbef of weis required for a milestone
         *    State variable: weiRequired
         *
         * 2. Percentage of (total weis raised - sum of weis required by (1))
         *    that will be locked
         *    State variable: percentage
         *
         * If weiRequired = 0, then (2) applies, otherwise (1) applies
         */

        // exact number of weis that will be locked 
        uint weiRequired;

        // percentage of total weis raised that will be locked
        uint percentage;

        // whether the current milestone has been merged to the next one
        bool mergedToNext;
    }

    // milestones
    // the root node has an index of zero
    // 0.4.18 does not support public array of nested struct, flattened
    Milestone[] public m;

    // record decision for a milestone to save gas
    mapping(uint8 => uint8) finalDecision;

    // DEBUG OPTIONS
    bool DEBUG = true;
    uint DEBUG_now = 0;

    modifier inState(uint8 id, uint8 _state) {
        require(_state == state(id));
        _;
    }

    function Milestones() public {
        Milestone memory milestone;
        milestone.name = "ROOT";
        milestone.parent = 0;

        // we set the root node's deadline to the current timestamp plus 1 week,
        // which leaves 1 week for setting up the milestone tree.
        // the root node's deadline indicates the starting time of the whole process
        // project founders need to take this part into their deployment consideration.
        milestone.deadline = _now().add(1 weeks);

        m.push(milestone);
    }

    function setProjectMeta(address addr) external {
        projectMeta = ProjectMeta(addr);
    }

    function addMilestone(string name, uint deadline, uint8 parent) external {
        require(valid(parent));
        Milestone memory milestone;
        milestone.name = name;
        milestone.deadline = deadline;
        milestone.parent = parent;

        if (m.length > 0) {
            // deadline restriction
            require(m[parent].deadline.add(1 weeks) < deadline);
        }

        m.push(milestone);
    }

    function getParent(uint8 id) public view returns (uint8) {
        require(valid(id));
        return m[id].parent;
    }

    // deposit ETH raised from a crowdsale by the project founder to this milestone
    function depositETH(uint8 id, uint val) external payable inState(id, INACTIVE) {
        require(valid(id));
        require(projectMeta.accessibleBy(keccak256("Milestones.depositETH"), msg.sender));

        // update this vetex
        m[id].weiLocked = m[id].weiLocked.add(val);
    }

    // returns true only if all milestones are in a terminal state
    function completed() external view returns (bool) {
        for(uint i=0; i < m.length; i++) {
            if(state(uint8(i)) != TERMINAL) {
                return false;
            }
        }
        return true;
    }

    // returns true if id is a valid milestone id
    function valid(uint8 id) public view returns (bool) {
        return (id < m.length);
    }

    function getWeiLocked(uint8 id) public view returns (uint) { 
        require(valid(id));
        return m[id].weiLocked;
    }

    function setWeiLocked(uint8 id, uint val) public {
        require(valid(id));
        require(projectMeta.accessibleBy(keccak256("Milestones.setWeiRequired"), msg.sender));
        m[id].weiRequired = val;
    }

    function getWeiRequired(uint8 id) public view returns (uint) { 
        require(valid(id));
        return m[id].weiRequired;
    }

    function getPercentage(uint8 id) public view returns (uint) { 
        require(valid(id));
        return m[id].percentage;
    }

    function getMilestoneCount() public view returns (uint) {
        return m.length;
    }

    function getDeadline(uint8 id) public view returns (uint) {
        return m[id].deadline;
    }

    function state(uint8 id) public view returns (uint) {
        require(valid(id));

        uint nowVal = _now();

        if (id == 0) {
            // root node
            if(nowVal >= m[id].deadline.add(1 weeks)) {
                // already passed the deadline, root node is in TERMINAL
                return TERMINAL;
            } else {
                // before root node's deadline, root node is in C
                return C;
            }
        } else {
            // non-root node
            uint parentTerminalTime = m[m[id].parent].deadline.add(1 weeks);

            if (nowVal < parentTerminalTime) {
                return INACTIVE;
            } else if (parentTerminalTime <= nowVal && nowVal < m[id].deadline.sub(1 weeks)) {
                return IP;
            } else if (m[id].deadline.sub(1 weeks) <= nowVal && nowVal < m[id].deadline) {
                return PENDING;
            } else if (m[id].deadline <= nowVal && nowVal < m[id].deadline.add(1 weeks)) {

                if(finalDecision[id] > 0) {
                    // decision has been made, no need to compute again
                    return finalDecision[id];
                }
                // decision is made
                ICriteriaController criteriaController =  ICriteriaController(projectMeta.getAddress(keccak256("contract.name", "ICriteriaController")));

                uint decision = criteriaController.getDecision(id);
                finalDecision[id] = decision;

                if (decision == 0) {
                    // undetermined
                    return POSTPONED;
                } else if (decision == 1) {
                    // accepted
                    return C;
                } else if (decision == 2) {
                    // rejected
                    return RP;
                }
            } else {
                return TERMINAL;
            }
        }
    }

    // Debug options
    function _now() internal returns (uint) {
        // DEBUG is false or DEBUG_no is zero
        if(!DEBUG) return now;
        return DEBUG_now;
    }

    function setNow(uint val) public {
        DEBUG_now = val;
    }
}
