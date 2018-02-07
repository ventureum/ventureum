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

        // objectives hash
        // Usage(js): let _hash_obj = '0x' + web3.sha3(text);
        bytes32 hashObj;

        // parent milestone
        uint8 parent;

        // deadline of the milestone
        uint deadline;

        // number of weis locked in this milestone
        uint weiLocked;

        // whether the current milestone has been merged to the next one
        bool mergedToNext;
    }

    // milestones
    // the root node has an index of zero
    // 0.4.18 does not support public array of nested struct, flattened
    Milestone[] public m;

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
        milestone.hashObj = 0;
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

    function addMilestone(string name, uint deadline, bytes32 hashObj, uint8 parent) external {
        require(valid(parent));
        Milestone memory milestone;
        milestone.name = name;
        milestone.deadline = deadline;
        milestone.hashObj = hashObj;
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

    // verify objectives hash
    function verifyObjectives(uint8 id, bytes32 hashObj) public view returns (bool) {
        require(valid(id));
        return (m[id].hashObj == hashObj);
    }

    // deposit ETH raised from a crowdsale by the project founder to this milestone
    function depositETHByProjectFounder(uint8 id) external payable onlyOwner inState(id, INACTIVE) {
        require(valid(id));

        // update this vetex
        m[id].weiLocked = m[id].weiLocked.add(msg.value);
    }

    // withdraw ETH by the project founder from this milestone after the 
    // decision of releasing milestone payment is approved by the majority of
    // investors
    function withdrawETHByProjectFounder(uint8 id, address beneficiary) external onlyOwner inState(id, C) {
        require(valid(id));
         uint weiToSend = m[id].weiLocked;
         m[id].weiLocked = 0;
         beneficiary.transfer(weiToSend);
    }

    function withdrawRefund(uint8 id) external inState(id, RP) {
        require(valid(id));

        IRefundManager refundManager = IRefundManager(projectMeta.getAddress(keccak256("contract.name", "IRefundManager")));

        uint refund = refundManager.refundAmount(id, msg.sender);

        // transfer refund to the investor
        refundManager.clear(id, msg.sender);
        msg.sender.transfer(refund);
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
                // decision is made
                ICriteriaController criteriaController =  ICriteriaController(projectMeta.getAddress(keccak256("contract.name", "ICriteriaController")));

                uint decision = criteriaController.getDecision(id);

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
