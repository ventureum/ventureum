// return the current deadline of the milestone
function getDeadline(uint8 id) return (uint) {
    ifV(m[id].VP2Initiated) {
        if(m[id].deadline + 1 weeks <= now) {
            // only use the new deadline after VP2 has passed
            if(!ballot.votingResults(id, VP1) &&
               ballot.votingResults(id, VP2)) {
                // VP1 rejected, VP2 approved
                // use the new deadline
                return m[id]._VP2Info.deadline;
            }
        }
    }

    // use the original deadline
    if(m[id].deadline == 0) {
        if(state(m[id].parent) == TERMINAL) {
            deadline = getDeadline(m[id].parent) + m[id].TTC * 1 days;
        }
    }
    return deadline;
}

/**
 * returns the current state of a milestone
 * note that state() itself is not a transaction since state of the network is not changed  */
function states(uint8 id) public returns (uint8, uint8, uint8) {

    if(id == 0) {
        // root node, always return TERMINAL
        return (TERMINAL, TERMINA, TERMINAL);
    }

    if(state(m[id].parent) != TERMINAL) {
        return (INACTIVE, INACTIVE, INACTIVE);
    }

    // get the current deadline
    uint _deadline = getDeadline(id);

    if (now < _deadline - 1 * weeks) {
        if (!m[id].VP2Initiated) {
            // IP before VP1
            return (INACTIVE, IP, VP1);
        }
        else if (_deadline <= now){
            // we are past the old _deadline
            // VP2 passed, we are at VP1_AFTER_VP2
            return (VP2, IP, VP1_AFTER_VP2);
        }
    } else if (_deadline - 1 * weeks <= now && now < _deadline) {
        if (!m[id].VP2Initiated) {
            // VP2 has not been init, next state is undetermined
            return (IP, VP1, UNDERTERMINED);
        } else if(_deadline <= now) {
            // we are past the old _deadline
            // VP1 After VP2
            return (IP, VP1_AFTER_VP2, UNDERTERMINED);
        }
    } else if(_deadline <= now && now < _deadline + 1 * weeks) {
        if (!m[id].VP2Initiated) {
            // VP2 has not been initiated
            if (ballot.votingResults(id, VP1)){
                // VP1 passed, now we are at C
                return (VP1, C, TERMINAL);
            } else {
                // VP1 rejected, VP2 not initiated, state is RP
                return (VP1, RP, TERMINAL);
            }
        } else {
            // VP2 initiated
            if(m[id]._VP2Info._deadline <= now) {
                // we are past VP1_AFTER_VP2
                if(ballot.votingResults(id, VP1_AFTER_VP2)) {
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
    } else if(_deadline + 1 * weeks <= now && now < _deadline + 2 * weeks) {
        if(!m[id].VP2Initiated) {
            // VP2 has not been initiated
            if (ballot.votingResults(id, VP1)){
                // C passed, now we are at TERMINAL
                return (C, TERMINAL, TERMINAL);
            } else {
                // RP passed, now we are at TERMINAL
                return (RP, TERMINAL, TERMINAL);
            }
        } else {
            if(ballot.votingResults(id, VP2)) {
                // VP2 approved, we are using the new _deadline,
                // which implies we are past the new _deadline and
                // VP1_AFTER_VP2
                if(ballot.votingResults(id, VP1_AFTER_VP2)) {
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
function state(uint8 id) returns (uint8) {
    (uint8 pre, uint8 curr, uint8 next) = states(id);
    return curr;
}

// return the previous state
function preState(uint8 id) returns (uint8) {
    (uint8 pre, uint8 curr, uint8 next) = states(id);
    return pre;
}

// return the next states
function nextState(uint8 id) returns (uint8) {
    (uint8 pre, uint8 curr, uint8 next) = states(id);
    return next;
}
