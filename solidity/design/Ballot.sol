Contract Ballot is Ownable {

    ProjectMeta public projectMeta;

    struct IndividualVoteInfo {
        uint tokensStaked;
        bool voted;
        // whether the investor voted "approve"
        bool approved;
    }

    struct VoteInfo {
        // approve rate with 18 decimal precision
        uint approval;
        uint disapproval;
        uint totalTokenStaked;

        // investor address => IndividualVoteInfo
        mapping(address => IndividualVoteInfo) individualVoteInfo;
    }

    // milestone id => voting state => VoteInfo
    mapping(uint8 => mapping(uint8 => VoteInfo))  voteInfo;


    function stake(uint8 id, uint value) public {
        // must be a valid milestone id
        Milestones milestone = projectMeta.milestones();
        require(milestones.valid(id));

        // staking is only allowed during IP
        require(milestones.state(id) == IP);

        // and 30 days before VP1 or VP1 After VP2
        require(now < milestones.deadline(id) - 30 * days);

        /** In order to transfer tokens owned by someone else, we need to do it in
         * two steps:
         * 1. Investor call token.approve(address(ballotAddr), value) from web3
         * 2. Transfer funds from the investor to this contract using transferFrom()
         */
        ERC20 token = projectMeta.token();
        require(token.transferFrom(msg.sender, address(this), value));

        uint8 nextState = milestones.nextState(id);

        VoteInfo storage _voteInfo = voteInfo[id][nextState];
        IndividualVoteInfo storage _individualVoteInfo = _voteInfo.individualVoteInfo[msg.sender];

        // update the total number of tokens staked for this voting period
        _voteInfo.totalTokenStaked += value;

        // update the number of tokens staked by this address
        _individualVoteInfo.tokensStaked += value;
    }

    // withdraw staked tokens
    function withdraw(uint8 id) public {
        // must be a valid milestone id
        Milestones milestone = projectMeta.milestones();
        require(milestones.valid(id));

        // withdrawal is allowed during the following states:
        // IP, C, RP, TERMINAL
        uint8 state = milestones.state(id);
        require(state == IP || state == C || state == RP || state == TERMINAL);

        // tokens to be withdrawn
        uint tokensStaked = 0;

        // we process withdrawal requests for tokens staked for both VP1 and VP1 After VP2 
        VoteInfo storage _voteInfoVP1 = voteInfo[id][VP1];
        IndividualVoteInfo storage _individualVoteInfoVP1 = _voteInfoVP1.individualVoteInfo[msg.sender];

        tokensStaked += _individualVoteInfoVP1.tokensStaked;
        _individualVoteInfoVP1.tokensStaked = 0;

        VoteInfo storage _voteInfoVP1AfterVP2 = voteInfo[id][VP1_AFTER_VP2];
        IndividualVoteInfo storage _individualVoteInfoVP1AfterVP2 = _voteInfoVP1AfterVP2.individualVoteInfo[msg.sender];

        tokensStaked += _individualVoteInfoVP1AfterVP2.tokensStaked;
        _individualVoteInfoVP1AfterVP2.tokensStaked = 0;

        // transfer tokens back to the investor
        ERC20 token = projectMeta.token();
        require(token.transfer(msg.sender, tokensStaked));
    }

    // called by investors
    function vote(uint8 id, bool approve) return (uint) public {
        // must be a valid milestone id
        Milestones milestone = projectMeta.milestones();
        require(milestones.valid(id));

        /** ID:
         *  2: VP1
         *  3: VP2
         *  4: VP1_AFTER_VP2
         *  others: ineligible for voting
         */
        uint8 state = milestones.state(id);

        // must be at a voting period
        require(state == VP1 || state == VP2 || state == VP1_AFTER_VP2);

        VoteInfo storage _voteInfo = voteInfo[id][state];
        IndividualVoteInfo storage _individualVoteInfo = _voteInfo.individualVoteInfo[msg.sender];

        // can only vote once
        require(!_individualVoteInfo.voted);
        _individualVoteInfo.voted = true;
        _individualVoteInfo.approved = approve;

        // now we calculate the voting weight, scaled up by 1e18
        uint votingWeight18 = (_individualVoteInfo.tokensStaked * 1e18) / _voteInfo.totalTokensStaked;

        if(approve) {
            _voteInfo.approval += votingWeight18;
        } else {
            _voteInfo.disapproval += votingWeight18;
        }

        // calculate effective refunds based on VP1
        if(state == VP1 || state == VP1_AFTER_VP2) {
            projectMeta.refundManager().updateRefund(id, msg.sender, tokensStaked);
        }

        return votingWeight18;
    }

    // returns the approval rating of a voting period in percentage with 18 decimal precision
    function getApprovalRating(uint8 id, uint8 votingPeriodID) view returns (uint) {
        // must be a valid milestone id
        Milestones milestone = projectMeta.milestones();
        require(milestones.valid(id));

        VoteInfo storage _voteInfo = voteInfo[id][votingPeriodID];
        return (_voteInfo.approval * 1e18)/(_voteInfo.approval + _voteInfo.disapproval);
    }

    // returns true if approved, otherwise returns false
    function getVotingResults(uint8 id, uint8 votingPeriodID) view returns (bool) {
        // must be a valid milestone id
        Milestones milestone = projectMeta.milestones();
        require(milestones.valid(id));

        VoteInfo storage _voteInfo = voteInfo[id][votingPeriodID];
        return _voteInfo.approval > _voteInfo.disapproval;
    }

    // return true if the investor voted "Yes" in a voting period of a milestone, otherwise return false
    function hasApproved(uint8 id, address investor, uint8 votingPeriodID) public view returns (bool) {
        // must be a valid milestone id
        Milestones milestone = projectMeta.milestones();
        require(milestones.valid(id));

        return voteInfo[milestoneAddr][votingPeriodID].individualVoteInfo[investor].approved;
    }
}
