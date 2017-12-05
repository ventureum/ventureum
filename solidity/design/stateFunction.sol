// State def: 0:INACTIVE, 1:IP, 2:VP1, 3:VP2, 4:VP1 After VP2, 5:C, 6:RP, 7:WVP2
function state() public {
  if(RPPerm) {
    // state is in RP permenently, always return RP in this case
    return 6;
  }

  if(deadline == 0){
    // deadline has not been set and RPPerm is false => the state is INACTIVE
    // we only check its parent's state
    Milestone parent = Milestone(parentAddr);
    uint8 parentState = parent.state();

    if(parentState < 5){
      // INACTIVE if parent is not in a terminal state
      return 0;
    } else if(parentState == 5) {
      // parent milestone is complete, now this milestone is activated
      // first calculate deadline using parent's deadline
      deadline = parent.deadline() + TTC;
    } else if(parentState == 6) {
      // parent milestone is in RP, set state to RP permenently
      RPPerm = true;
      return 6;
    }
  }

  // now deadline must have been set, state is determined using deadline

  if(now < deadline - 1 * weeks){
    // IP
    return 1;
  } else if(deadline - 1 * weeks <= now && now < deadline && !VP2Initiated) {
    // VP1
    return 2;
  } else if(deadline <= now && now < deadline + 1 * weeks && VP2Initiated && !deadlineUpdated) {
    // VP2, deadlineUpdated is needed since we don't know if this happens after VP2 or during VP2
    return 3;
  } else if(deadline - 1 * weeks <= now && now < deadline && VP2Initiated) {
    // VP1 After VP2
    return 4;
  } else if(deadline <= now) {
    if(!VP2Initiated) {
      // VP2 has not been initiated
      if(ballot.votingResults(address(this), 2)){
        // VP1 passed, now we are at C
        return 5;
      } else {
        // VP1 rejected, VP2 not initiated, state is RP
        return 6;
      }
    } else {
      // VP2 has been initiated
      if(deadlineUpdated){
        // We are at state 4 (VP1 After VP2), only check VP1 After VP2 results
        if(ballot.votingResults(address(this), 4)){
          // VP1 After VP2 passed, go to C
          return 5;
        } else {
          // VP1 After VP2 rejected, go to RP
          return 6;
        }
      }
      else{
        // In this case, we need to consider VP2 results as well
        if(deadline + 1 * weeks <= now) {
          if(ballot.votingResults(address(this), 3)){
            // VP2 passed, but the new deadline has not been updated,
            // staying at WVP2 and waiting for project founder to call
            // finalizeVP2(), which updates deadline and objectives
            return 7;
          } else {
            // VP2 rejected,  state is RP
            return 6;
          }
        }
      }
    }
  }
  // this shouldn't happen
  throw;
}
