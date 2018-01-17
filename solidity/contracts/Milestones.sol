pragma solidity ^0.4.18;

import './SafeMath.sol';
import './Ownable.sol';
import './States.sol';
import './ProjectMeta.sol';
import './IRefundManager.sol';
import './IBallot.sol';
import './SafeMath.sol';

contract Milestones is Ownable, States {

    using SafeMath for uint;

    // project meta info
    ProjectMeta public projectMeta;

    // number of weis locked in this milestone
    struct WeiLocked {
        uint subtree;
        uint vertex;
    }

    // VP2 info
    struct VP2Info {
        // tentative new time-to-completion and/or a tentative new objectives
        // tentative ttc and objectives become the milestone's ttc and objectives once VP2 gets approved
        uint TTC;
        bytes32 hash_obj;
        uint deadline;
    }


    struct Milestone {
        // milestone name
        string name;

        // TTC (Time-to-completion) in days
        uint TTC;

        // objectives hash
        // Usage(js): let _hash_obj = '0x' + web3.sha3(text);
        bytes32 hashObj;

        // parent milestone
        uint8 parent;

        // whether VP2 has been initiated
        bool VP2Initiated;

        // deadline of the milestone
        uint deadline;
    }

    // milestones
    // the root node has an index of zero
    // 0.4.18 does not support public array of nested struct, flattened
    Milestone[] public m;

    // using mapping so we do not need to worry about initialization
    mapping(uint8 => WeiLocked) public weiLocked;
    mapping(uint8 => VP2Info) public _VP2Info;

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
        milestone.TTC = 0;
        milestone.hashObj = 0;
        milestone.parent = 0;
        milestone.VP2Initiated = false;

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

    function addMilestone(string name, uint TTC, bytes32 hashObj, uint8 parent) external {
        require(valid(parent));
        Milestone memory milestone;
        milestone.name = name;
        milestone.TTC = TTC;
        milestone.hashObj = hashObj;
        milestone.parent = parent;
        milestone.deadline = m[parent].deadline.add(TTC.mul(1 days));
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
        weiLocked[id].vertex = weiLocked[id].vertex.add(msg.value);

        // update all ancestors
        uint8 curr = m[id].parent;
        while(true) {
            weiLocked[curr].subtree =  weiLocked[curr].subtree.add(msg.value);
            if(curr == 0) break;
            curr = m[curr].parent;
        }
    }

    // withdraw ETH by the project founder from this milestone after the 
    // decision of releasing milestone payment is approved by the majority of
    // investors
    function withdrawETHByProjectFounder(uint8 id, address beneficiary) external onlyOwner inState(id, TERMINAL) {
        require(valid(id));
        if(preStateTx(id) == C) {
            uint weiToSend = weiLocked[id].vertex;
            weiLocked[id].vertex = 0;
            beneficiary.transfer(weiToSend);
        }
    }

    // initialize VP2 while in VP1
    function initVP2(uint8 id, uint TTC, bytes32 hash_obj) external onlyOwner inState(id, VP1) {
        require(valid(id));

        // can only be initiated once
        require(!m[id].VP2Initiated);
        m[id].VP2Initiated = true;
        _VP2Info[id].TTC = TTC;
        _VP2Info[id].hash_obj = hash_obj;

        _VP2Info[id].deadline = getDeadline(m[id].parent).add(_VP2Info[id].TTC * 1 days);
    }

    function withdrawRefund(uint8 id) external {
        require(valid(id));

        IRefundManager refundManager = projectMeta.refundManager();

        uint8 preState = preStateTx(id);
        uint8 currState = stateTx(id);

        // must be at a valid state
        require(currState == RP || currState == C);

        uint8 stateForRefund = 0;
        if(preState == VP1 || preState == VP2) {
            // we use tokens staked at VP1 for calculating refunds
            stateForRefund = VP1;
        } else if(preState == VP1_AFTER_VP2) {
            // we use tokens staked at VP1_AFTER_VP2 for calculating refunds
            stateForRefund = VP1_AFTER_VP2;
        }

        require(stateForRefund != 0);

        var (subtree, vertex) = refundManager.refundAmount(id, msg.sender, stateForRefund);

        uint refund = 0;
        if(currState == RP) {
            // we consider the entire subtree in this case
            refund = subtree;
        } else if(currState == C) {
            // we consider the current vertex (milestone node)
            // in the previous voting, investor who voted for a refund will
            // receive a refund
            IBallot ballot = projectMeta.ballot();
            if(!ballot.hasApproved(id, msg.sender, preState)) {
                refund = vertex;
            }
        }

        // transfer refund to the investor
        refundManager.clear(id, msg.sender, stateForRefund);
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

    function getWeiLocked(uint8 id) public view returns (uint, uint) { 
        require(valid(id));
        return (weiLocked[id].subtree, weiLocked[id].vertex);
    }

    function getMilestoneCount() public view returns (uint) {
        return m.length;
    }
    // return the (original deadline, current deadline) of the milestone
    // state variables will potentially be modified
    function getBothDeadlinesTx(uint8 id) public returns (uint, uint) {
        uint oldDeadline;
        uint deadline = m[id].deadline;

        // the original deadline
        if(deadline == 0) {
            if(state(m[id].parent) == TERMINAL) {
                deadline = getDeadline(m[id].parent).add(m[id].TTC * 1 days);
                // set oldDeadline = actual deadline first
                oldDeadline = deadline;
                m[id].deadline = deadline;
            }
        }

        if(m[id].VP2Initiated) {
            // only use the new deadline after VP2 has passed
            IBallot ballot = projectMeta.ballot();
            if(!ballot.getVotingResults(id, VP1) &&
               ballot.getVotingResults(id, VP2)) {
                // VP1 rejected, VP2 approved
                // use the new deadline for the actual deadline
                deadline = _VP2Info[id].deadline;
            }
        }
        return (oldDeadline, deadline);
    }

    // return the (original deadline, current deadline) of the milestone
    // state variables will not be modified
    function getBothDeadlines(uint8 id) public view returns (uint, uint) {
        uint oldDeadline;
        uint deadline = m[id].deadline;

        // the original deadline
        if(deadline == 0) {
            if(state(m[id].parent) == TERMINAL) {
                deadline = getDeadline(m[id].parent).add(m[id].TTC * 1 days);
                // set oldDeadline = actual deadline first
                oldDeadline = deadline;
            }
        }

        if(m[id].VP2Initiated) {
            // only use the new deadline after VP2 has passed
            IBallot ballot = projectMeta.ballot();
            if(!ballot.getVotingResults(id, VP1) &&
               ballot.getVotingResults(id, VP2)) {
                // VP1 rejected, VP2 approved
                // use the new deadline for the actual deadline
                deadline = _VP2Info[id].deadline;
            }
        }
        return (oldDeadline, deadline);
    }

    function getDeadlineTx(uint8 id) public returns (uint) {
        var (oldDeadline, deadline) = getBothDeadlinesTx(id);
        oldDeadline;
        return deadline;
    }

    function getDeadline(uint8 id) public view returns (uint) {
        var (oldDeadline, deadline) = getBothDeadlines(id);
        oldDeadline;
        return deadline;
    }

    /**
     * returns (previous state, current state, next state) of a milestone
     * note that state() itself is not a transaction since state of the network is not changed
     */
    function states(uint8 id, uint _deadline, uint _oldDeadline) public view returns (uint8, uint8, uint8) {
        if(id == 0) {
            // root node
            if(_now() >= _deadline) {
                // already passed the deadline, root node is in TERMINAL
                return (C, TERMINAL, TERMINAL);
            } else {
                // before root node's deadline, root node is in C
                return (INACTIVE, C, TERMINAL);
            }
        }

        if(state(m[id].parent) != TERMINAL) {
            return (INACTIVE, INACTIVE, INACTIVE);
        }

        IBallot ballot = projectMeta.ballot();

        if (_oldDeadline <= _now()) {
            if (ballot.getVotingResults(id, VP1)) {
                // VP1 passed, switch to C
                return (VP1, C, TERMINAL);
            }
        }

        if (_now() < _deadline.sub(1 weeks)) {
            if (!m[id].VP2Initiated) {
                // IP before VP1
                return (INACTIVE, IP, VP1);
            }
            else if (_oldDeadline <= _now()){
                // we are past the old _deadline
                // VP2 passed, we are at VP1_AFTER_VP2
                return (VP2, IP, VP1_AFTER_VP2);
            }
        } else if (_deadline.sub(1 weeks) <= _now() && _now() < _deadline) {
            if (!m[id].VP2Initiated) {
                // VP2 has not been init, next state is undetermined
                return (IP, VP1, UNDETERMINED);
            } else if(_oldDeadline <= _now()) {
                // we are past the old _deadline
                // VP1 After VP2
                return (IP, VP1_AFTER_VP2, UNDETERMINED);
            }
        } else if(_deadline <= _now() && _now() < _deadline.add(1 weeks)) {
            if (!m[id].VP2Initiated) {
                // VP2 has not been initiated
                if (ballot.getVotingResults(id, VP1)){
                    // VP1 passed, _now() we are at C
                    return (VP1, C, TERMINAL);
                } else {
                    // VP1 rejected, VP2 not initiated, state is RP
                    return (VP1, RP, TERMINAL);
                }
            } else {
                // VP2 initiated
                if(_VP2Info[id].deadline <= _now()) {
                    // we are past VP1_AFTER_VP2
                    if(ballot.getVotingResults(id, VP1_AFTER_VP2)) {
                        // VP1 After VP2 passed, previous state is C
                        return (VP1_AFTER_VP2, C, TERMINAL);
                    } else {
                        // VP1 After VP2 rejected, previous state is RP
                        return (VP1_AFTER_VP2, RP, TERMINAL);
                    }
                } else {
                    // we are at VP2
                    return (VP1, VP2, UNDETERMINED);
                }
            }
        } else if(_deadline.add(1 weeks) <= _now() && _now() < _deadline.add( 2 * 1 weeks)) {
            if(!m[id].VP2Initiated) {
                // VP2 has not been initiated
                if (ballot.getVotingResults(id, VP1)){
                    // C passed, _now() we are at TERMINAL
                    return (C, TERMINAL, TERMINAL);
                } else {
                    // RP passed, _now() we are at TERMINAL
                    return (RP, TERMINAL, TERMINAL);
                }
            } else {
                if(ballot.getVotingResults(id, VP2)) {
                    // VP2 approved, we are using the new _deadline,
                    // which implies we are past the new _deadline and
                    // VP1_AFTER_VP2
                    if(ballot.getVotingResults(id, VP1_AFTER_VP2)) {
                        // VP1 After VP2 passed, previous state is C
                        return (C, TERMINAL, TERMINAL);
                    } else {
                        // VP1 After VP2 rejected, previous state is RP
                        return (RP, TERMINAL, TERMINAL);
                    }
                } else {
                    // VP2 rejected
                    return (VP2, RP, TERMINAL);
                }
            }
        } else {
            // Although the previous state is potentially incorrect,
            // it does affect our core functions of milestone contracts
            return (TERMINAL, TERMINAL, TERMINAL);
        }
    }

    // return the current state
    function state(uint8 id) public view returns (uint8) {
        var (oldDeadline, deadline) = getBothDeadlines(id);
        var (pre, curr, next) = states(id, oldDeadline, deadline);

        // suppress warning
        pre;
        next;

        return curr;
    }

    // return the previous state
    function preState(uint8 id) public view returns (uint8) {
        var (oldDeadline, deadline) = getBothDeadlines(id);
        var (pre, curr, next) = states(id, oldDeadline, deadline);

        // suppress warning
        curr;
        next;

        return pre;
    }

    // return the next states
    function nextState(uint8 id) public view returns (uint8) {
        var (oldDeadline, deadline) = getBothDeadlines(id);
        var (pre, curr, next) = states(id, oldDeadline, deadline);

        // suppress warning
        pre;
        curr;

        return next;
    }

    // return the current state
    function stateTx(uint8 id) public returns (uint8) {
        var (oldDeadline, deadline) = getBothDeadlinesTx(id);
        var (pre, curr, next) = states(id, oldDeadline, deadline);

        // suppress warning
        pre;
        next;

        return curr;
    }

    // return the previous state
    function preStateTx(uint8 id) public returns (uint8) {
        var (oldDeadline, deadline) = getBothDeadlinesTx(id);
        var (pre, curr, next) = states(id, oldDeadline, deadline);

        // suppress warning
        curr;
        next;

        return pre;
    }

    // return the next states
    function nextStateTx(uint8 id) public returns (uint8) {
        var (oldDeadline, deadline) = getBothDeadlinesTx(id);
        var (pre, curr, next) = states(id, oldDeadline, deadline);

        // suppress warning
        pre;
        curr;

        return next;
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
