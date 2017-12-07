/**
 * returns the current state of a milestone
 * note that state() itself is not a transaction since state of the network is not changed
 */
function state() public {
  if(RPPerm) {
    // state is in RP permenently, always return RP in this case
    return RP;
  }

  uint _deadline = deadline;

  if(_deadline == INACTIVE){
    // deadline has not been set and RPPerm is false => the state is INACTIVE
    // we only check its parent's state
    Milestone parent = Milestone(parentAddr);
    uint8 parentState = parent.state();

    if(parentState < C){
      // INACTIVE if parent is not in a terminal state
      return INACTIVE;
    } else if(parentState == C) {
      // parent milestone is complete, now this milestone is activated
      // first calculate deadline using parent's deadline
      _deadline = parent.deadline() + TTC * days;
    } else if(parentState == RP) {
      // parent milestone is in RP
      return RP;
    }
  }

  // now deadline must have been calculated, state is determined using _deadline

  if(now < _deadline - 1 * weeks){
    // IP
    return IP;
  } else if(_deadline - 1 * weeks <= now && now < _deadline && !VP2Initiated) {
    // VP1
    return VP1;
  } else if(_deadline <= now && now < _deadline + 1 * weeks && VP2Initiated && !deadlineUpdated) {
    // VP2, deadlineUpdated is needed since we don't know if this happens after VP2 or during VP2
    return VP2;
  } else if(_deadline - 1 * weeks <= now && now < _deadline && VP2Initiated) {
    // VP1 After VP2
    return VP1_AFTER_VP2;
  } else if(_deadline <= now) {
    if(!VP2Initiated) {
      // VP2 has not been initiated
      if(ballot.votingResults(address(this), VP1)){
        // VP1 passed, now we are at C
        return C;
      } else {
        // VP1 rejected, VP2 not initiated, state is RP
        return RP;
      }
    } else {
      // VP2 has been initiated
      if(deadlineUpdated){
        // We are at state 4 (VP1 After VP2), only check VP1 After VP2 results
        if(ballot.votingResults(address(this), VP1_AFTER_VP2)){
          // VP1 After VP2 passed, go to C
          return C;
        } else {
          // VP1 After VP2 rejected, go to RP
          return RP;
        }
      }
      else {
        // In this case, we need to consider VP2 results as well
        if(_deadline + 1 * weeks <= now && now <= _deadline + 1 * weeks + 1 * days &&
           ballot.votingResults(address(this), VP2)) {
          // VP2 passed, but the new deadline has not been updated,
          // staying at WVP2 for maximum 24 hr start at deadline + 1W,
          // and waiting for project founder to call finalizeVP2(),
          // which updates deadline and objectives
          return WVP2;
        }

        // either VP2 rejected, or VP2 passed but VP2 was not finalized
        // during the 24 hr period after VP2 completed
        return RP;
      }
    }
  }
  // this shouldn't happen
  throw;
}
