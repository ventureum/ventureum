pragma solidity ^0.4.18;

import './SafeMath.sol';
import './Ownable.sol';
import './States.sol';
import './ProjectMeta.sol';
import './IRefundManager.sol';
import './Ballot.sol';
import './SafeMath.sol';

contract Milestones is Ownable, States {

    using SafeMath for uint;

    // project meta info
    ProjectMeta public projectMeta;

    struct WeiLocked {
        uint subtree;
        uint vertex;
    }

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

        // number of weis locked in this milestone
        WeiLocked weiLocked;

        // VP2 info
        VP2Info _VP2Info;
    }

    // milestones
    // the root node has an index of zero
    // 0.4.18 does not support public array of nested struct, set to private
    Milestone[] private m;

    modifier inState(uint8 id, uint8 _state) {
        require(_state == state(id));
        _;
    }

    function Milestones() public {
        Milestone memory milestone;
        milestone.name = "ROOT";

        // we set the root node's deadline to the current timestamp plus 1 week,
        // which leaves 1 week for setting up the milestone tree.
        // the root node's deadline indicates the starting time of the whole process
        // project founders need to take this part into their deployment consideration.
        milestone.deadline = now.add(1 weeks);

        m.push(milestone);
    }

    function addMilestone(string name, uint TTC, bytes32 hashObj) external {
        Milestone memory milestone;
        milestone.name = name;
        milestone.TTC = TTC;
        milestone.hashObj = hashObj;
        m.push(milestone);
    }

    // set parent milestone, can only be done when state is INACTIVE
    function setParent(uint8 id, uint8 parent) external onlyOwner inState(id, INACTIVE) {
        require(valid(id));
        m[id].parent = parent;
    }

    function getParent(uint8 id) public view returns (uint8) {
        require(valid(id));
        return m[id].parent;
    }

    // verify objectives hash
    function verifyObjectives(uint8 id, bytes32 hashObj) public view inState(id, INACTIVE) returns (bool) {
        require(valid(id));
        return (m[id].hashObj == hashObj);
    }

    // deposit ETH raised from a crowdsale by the project founder to this milestone
    function depositETHByProjectFounder(uint8 id) external payable onlyOwner inState(id, INACTIVE) {
        require(valid(id));

        // update this vetex
        m[id].weiLocked.vertex = m[id].weiLocked.vertex.add(msg.value);

        // update all ancestors
        uint8 curr = m[id].parent;
        while(true) {
            m[curr].weiLocked.subtree =  m[curr].weiLocked.subtree.add(msg.value);
            if(curr == 0) break;
            curr = m[curr].parent;
        }
    }

    // withdraw ETH by the project founder from this milestone after the 
    // decision of releasing milestone payment is approved by the majority of
    // investors
    function withdrawETHByProjectFounder(uint8 id, address beneficiary) external onlyOwner inState(id, C) {
        require(valid(id));

        uint weiToSend = m[id].weiLocked.vertex;
        m[id].weiLocked.vertex = 0;

        beneficiary.transfer(weiToSend);
    }

    // initialize VP2 while in VP1
    function initVP2(uint8 id, uint TTC, bytes32 hash_obj) external onlyOwner inState(id, VP1) {
        require(valid(id));

        // can only be initiated once
        require(!m[id].VP2Initiated);
        m[id].VP2Initiated = true;
        m[id]._VP2Info.TTC = TTC;
        m[id]._VP2Info.hash_obj = hash_obj;
        m[id]._VP2Info.deadline = getDeadline(m[id].parent).add(m[id]._VP2Info.TTC * 1 days);
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
            Ballot ballot = projectMeta.ballot();
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
        return (m[id].weiLocked.subtree, m[id].weiLocked.vertex);
    }

    // return the current deadline of the milestone
    // state variables will potentially be modified
    function getDeadlineTx(uint8 id) public returns (uint) {
        if(m[id].VP2Initiated) {
            // only use the new deadline after VP2 has passed
            Ballot ballot = projectMeta.ballot();
            if(!ballot.getVotingResults(id, VP1) &&
               ballot.getVotingResults(id, VP2)) {
                // VP1 rejected, VP2 approved
                // use the new deadline
                return m[id]._VP2Info.deadline;
            }
        }

        // use the original deadline
        if(m[id].deadline == 0) {
            if(stateTx(m[id].parent) == TERMINAL) {
                m[id].deadline = getDeadlineTx(m[id].parent).add(m[id].TTC * 1 days);
            }
        }
        return m[id].deadline;
    }

    // return the current deadline of the milestone
    // state variables will not be modified
    function getDeadline(uint8 id) public view returns (uint) {
        if(m[id].VP2Initiated) {
            // only use the new deadline after VP2 has passed
            Ballot ballot = projectMeta.ballot();
            if(!ballot.getVotingResults(id, VP1) &&
               ballot.getVotingResults(id, VP2)) {
                // VP1 rejected, VP2 approved
                // use the new deadline
                return m[id]._VP2Info.deadline;
            }
        }

        // use the original deadline
        if(m[id].deadline == 0) {
            if(state(m[id].parent) == TERMINAL) {
                return  getDeadline(m[id].parent).add(m[id].TTC * 1 days);
            }
        }
        return m[id].deadline;
    }


    /**
     * returns (previous state, current state, next state) of a milestone
     * note that state() itself is not a transaction since state of the network is not changed
     */
    function states(uint8 id, uint _deadline) public view returns (uint8, uint8, uint8) {
        if(id == 0) {
            // root node, always return TERMINAL
            return (TERMINAL, TERMINAL, TERMINAL);
        }

        if(state(m[id].parent) != TERMINAL) {
            return (INACTIVE, INACTIVE, INACTIVE);
        }

        Ballot ballot = projectMeta.ballot();

        if (now < _deadline.sub(1 weeks)) {
            if (!m[id].VP2Initiated) {
                // IP before VP1
                return (INACTIVE, IP, VP1);
            }
            else if (_deadline <= now){
                // we are past the old _deadline
                // VP2 passed, we are at VP1_AFTER_VP2
                return (VP2, IP, VP1_AFTER_VP2);
            }
        } else if (_deadline.sub(1 weeks) <= now && now < _deadline) {
            if (!m[id].VP2Initiated) {
                // VP2 has not been init, next state is undetermined
                return (IP, VP1, UNDETERMINED);
            } else if(_deadline <= now) {
                // we are past the old _deadline
                // VP1 After VP2
                return (IP, VP1_AFTER_VP2, UNDETERMINED);
            }
        } else if(_deadline <= now && now < _deadline.add(1 weeks)) {
            if (!m[id].VP2Initiated) {
                // VP2 has not been initiated
                if (ballot.getVotingResults(id, VP1)){
                    // VP1 passed, now we are at C
                    return (VP1, C, TERMINAL);
                } else {
                    // VP1 rejected, VP2 not initiated, state is RP
                    return (VP1, RP, TERMINAL);
                }
            } else {
                // VP2 initiated
                if(m[id]._VP2Info.deadline <= now) {
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
        } else if(_deadline.add(1 weeks) <= now && now < _deadline.add( 2 * 1 weeks)) {
            if(!m[id].VP2Initiated) {
                // VP2 has not been initiated
                if (ballot.getVotingResults(id, VP1)){
                    // C passed, now we are at TERMINAL
                    return (C, TERMINAL, TERMINAL);
                } else {
                    // RP passed, now we are at TERMINAL
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
        var (pre, curr, next) = states(id, getDeadline(id));

        // suppress warning
        pre;
        next;

        return curr;
    }

    // return the previous state
    function preState(uint8 id) public view returns (uint8) {
        var (pre, curr, next) = states(id, getDeadline(id));

        // suppress warning
        curr;
        next;

        return pre;
    }

    // return the next states
    function nextState(uint8 id) public view returns (uint8) {
        var (pre, curr, next) = states(id, getDeadline(id));

        // suppress warning
        pre;
        curr;

        return next;
    }

    // return the current state
    function stateTx(uint8 id) public returns (uint8) {
        var (pre, curr, next) = states(id, getDeadlineTx(id));

        // suppress warning
        pre;
        next;

        return curr;
    }

    // return the previous state
    function preStateTx(uint8 id) public returns (uint8) {
        var (pre, curr, next) = states(id, getDeadlineTx(id));

        // suppress warning
        curr;
        next;

        return pre;
    }

    // return the next states
    function nextStateTx(uint8 id) public returns (uint8) {
        var (pre, curr, next) = states(id, getDeadlineTx(id));

        // suppress warning
        pre;
        curr;

        return next;
    }
}
