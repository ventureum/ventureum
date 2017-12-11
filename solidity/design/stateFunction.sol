// return the current deadline of the milestone
function getDeadline() return (uint) {
    if(VP2Initiated) {
        if(deadline + 1 weeks <= now) {
            // only use the new deadline after VP2 has passed
            if(!ballot.votingResults(address(this), VP1) &&
               ballot.votingResults(address(this), VP2)) {
                // VP1 rejected, VP2 approved
                // use the new deadline
                return _VP2Info.deadline;
            }
        }
    }

    // use the original deadline
    if(deadline == 0) {
        if(parent.state() == TERMINATED) {
            deadline = parent.getDeadline() + TTC * 1 days;
        }
    }
    return deadline;

}

/**
 * returns the current state of a milestone
 * note that state() itself is not a transaction since state of the network is not changed  */
function states() public returns (uint8, uint8, uint8) {

    if(parent.state() != TERMINATED) {
        return (INACTIVE, INACTIVE, INACTIVE);
    }

    // get the current deadline
    uint _deadline = getDeadline();
    
    if (now < _deadline - 1 * weeks) {
        if (!VP2Initiated) {
            // IP before VP1
            return (INACTIVE, IP, VP1);
        }
        else if (_deadline <= now){
            // we are past the old _deadline
            // VP2 passed, we are at VP1_AFTER_VP2
            return (VP2, IP, VP1_AFTER_VP2);
        }
    } else if (_deadline - 1 * weeks <= now && now < _deadline) {
        if (!VP2Initiated) {
            // VP2 has not been init, next state is undetermined
            return (IP, VP1, UNDERTERMINED);
        } else if(_deadline <= now) {
            // we are past the old _deadline
            // VP1 After VP2
            return (IP, VP1_AFTER_VP2, UNDERTERMINED);
        }
    } else if(_deadline <= now && now < _deadline + 1 * weeks) {
        if (!VP2Initiated) {
            // VP2 has not been initiated
            if (ballot.votingResults(address(this), VP1)){
                // VP1 passed, now we are at C
                return (VP1, C, TERMINATED);
            } else {
                // VP1 rejected, VP2 not initiated, state is RP
                return (VP1, RP, TERMINATED);
            }
        } else {
            // VP2 initiated
            if(_VP2Info._deadline <= now) {
                // we are past VP1_AFTER_VP2
                if(ballot.votingResults(address(this), VP1_AFTER_VP2)) {
                    // VP1 After VP2 passed, previous state is C
                    return (VP1_AFTER_VP2, C, TERMINATED);
                } else {
                    // VP1 After VP2 rejected, previous state is RP
                    return (VP1_AFTER_VP2, RP, TERMINATED);
                }
            } else {
                // we are at VP2
                return (VP1, VP2, UNDETERMINED);
            }
        }
    } else if(_deadline + 1 * weeks <= now && now < _deadline + 2 * weeks) {
        if(!VP2Initiated) {
            // VP2 has not been initiated
            if (ballot.votingResults(address(this), VP1)){
                // C passed, now we are at TERMINATED
                return (C, TERMINATED, TERMINATED);
            } else {
                // RP passed, now we are at TERMINATED
                return (RP, TERMINATED, TERMINATED);
            }
        } else {
            if(ballot.votingResults(address(this), VP2)) {
                // VP2 approved, we are using the new _deadline,
                // which implies we are past the new _deadline and
                // VP1_AFTER_VP2
                if(ballot.votingResults(address(this), VP1_AFTER_VP2)) {
                    // VP1 After VP2 passed, previous state is C
                    return (C, TERMINATED, TERMINATED);
                } else {
                    // VP1 After VP2 rejected, previous state is RP
                    return (RP, TERMINATED, TERMINATED);
                }
            } else {
                // VP2 rejected
                return (VP2, RP, TERMINATED);
            }
        }
    } else {
        // Although the previous state is potentially incorrect,
        // it does affect our core functions of milestone contracts
        return (TERMINATED, TERMINATED, TERMINATED);
    }
}

// return the current state
function state() returns (uint8) {
    (uint8 pre, uint8 curr, uint8 next) = states();
    return curr;
}

// return the previous state
function preState() returns (uint8) {
    (uint8 pre, uint8 curr, uint8 next) = states();
    return pre;
}

// return the next states
function nextState() returns (uint8) {
    (uint8 pre, uint8 curr, uint8 next) = states();
    return next;
}
