pragma solidity ^0.4.24;

import "vetx-token/contracts/VetXToken.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

import "../../library/DLL.sol";
import "../../library/AttributeStore.sol";


/**
@title Partial-Lock-Commit-Reveal Voting scheme with ERC20 tokens 
@author Team: Aspyn Palatnick, Cem Ozer, Yorke Rhodes
*/
contract PLCRVoting is Ownable {
    using DLL for DLL.Data;
    using AttributeStore for AttributeStore.Data;
    using SafeMath for uint;

    event VoteCommitted(address voter, uint pollId, uint numTokens);
    event VoteRevealed(address voter, uint pollId, uint numTokens, uint choice);
    event PollCreated(uint voteQuorum, uint commitDuration, uint revealDuration, uint pollId);
    event VotingRightsGranted(address voter, uint numTokens);
    event VotingRightsWithdrawn(address voter, uint numTokens);

    /// maps user's address to voteToken balance
    mapping(address => uint) public voteTokenBalance;

    struct Poll {
        uint commitEndDate;     /// expiration date of commit period for poll
        uint revealEndDate;     /// expiration date of reveal period for poll
        uint voteQuorum;	    /// number of votes required for a proposal to pass
        uint votesFor;		    /// tally of votes supporting proposal
        uint votesAgainst;      /// tally of votes countering proposal
    }
    
    /// maps pollId to Poll struct
    mapping(uint => Poll) public pollMap;
    uint public pollNonce;

    mapping(address => DLL.Data) dllMap;

    AttributeStore.Data store;


    // ============
    // CONSTRUCTOR:
    // ============

    uint constant INITIAL_POLL_NONCE = 0;
    VetXToken public token;

    /**
    @dev Initializes voteQuorum, commitDuration, revealDuration, and 
        pollNonce in addition to token contract and trusted mapping
    @param _tokenAddr The address whe(setq debug-on-error t)re the ERC20 token contract is deployed
    */
    constructor(address _tokenAddr) public {
        token = VetXToken(_tokenAddr);
        pollNonce = INITIAL_POLL_NONCE;
    }

    // ================
    // TOKEN INTERFACE:
    // ================

    /**    
    @notice Loads _numTokens ERC20 tokens into the voting contract for one-to-one voting rights
    @dev Assumes that msg.sender has approved voting contract to spend on their behalf
    @param _numTokens The number of votingTokens desired in exchange for ERC20 tokens
    */
    function requestVotingRights(uint _numTokens) external {
        require(token.balanceOf(msg.sender) >= _numTokens);
        voteTokenBalance[msg.sender] = voteTokenBalance[msg.sender].add(_numTokens);
        require(token.transferFrom(msg.sender, this, _numTokens));
        emit VotingRightsGranted(msg.sender, _numTokens);
    }

    /**
    @notice Withdraw _numTokens ERC20 tokens from the voting contract, revoking these voting rights
    @param _numTokens The number of ERC20 tokens desired in exchange for voting rights
    */
    function withdrawVotingRights(uint _numTokens) external {
        uint availableTokens = voteTokenBalance[msg.sender].sub(getLockedTokens(msg.sender));
        require(availableTokens >= _numTokens);
        voteTokenBalance[msg.sender] = voteTokenBalance[msg.sender].sub(_numTokens);
        require(token.transfer(msg.sender, _numTokens));
        emit VotingRightsWithdrawn(msg.sender, _numTokens);
    }

    /**
    @dev Unlocks tokens locked in unrevealed vote where poll has ended
    @param _pollId Integer identifier associated with the target poll
    */
    function rescueTokens(uint _pollId) external {
        require(pollEnded(_pollId));
        require(!hasBeenRevealed(msg.sender, _pollId));

        dllMap[msg.sender].remove(_pollId);
    }

    // =================
    // VOTING INTERFACE:
    // =================

    /**
    @notice Commits vote using hash of choice and secret salt to conceal vote until reveal
    @param _pollId Integer identifier associated with target poll
    @param _secretHash Commit keccak256 hash of voter's choice and salt (tightly packed in this order)
    @param _numTokens The number of tokens to be committed towards the target poll
    @param _prevPollId The ID of the poll that the user has voted the maximum number 
        of tokens in which is still less than or equal to numTokens 
    */
    function commitVote(
        uint _pollId,
        bytes32 _secretHash,
        uint _numTokens,
        uint _prevPollId
    )
        external
    {
        require(commitStageActive(_pollId));
        require(voteTokenBalance[msg.sender] >= _numTokens); // prevent user from overspending
        require(_pollId != 0);  // prevent user from committing to zero node placeholder

        // TODO: Move all insert validation into the DLL lib
        // Check if _prevPollId exists
        require(_prevPollId == 0 || getCommitHash(msg.sender, _prevPollId) != 0);

        uint nextPollID = dllMap[msg.sender].getNext(_prevPollId);

        // if nextPollID is equal to _pollId, _pollId is being updated,
        nextPollID = (nextPollID == _pollId) ? dllMap[msg.sender].getNext(_pollId) : nextPollID;

        require(validPosition(_prevPollId, nextPollID, msg.sender, _numTokens));
        dllMap[msg.sender].insert(_prevPollId, _pollId, nextPollID);

        bytes32 UUID = attrUUID(msg.sender, _pollId);

        store.attachAttribute(UUID, "numTokens", _numTokens);
        store.attachAttribute(UUID, "commitHash", uint(_secretHash));

        emit VoteCommitted(msg.sender, _pollId, _numTokens);
    }

    /**
    @dev Compares previous and next poll's committed tokens for sorting purposes
    @param _prevID Integer identifier associated with previous poll in sorted order
    @param _nextID Integer identifier associated with next poll in sorted order
    @param _voter Address of user to check DLL position for
    @param _numTokens The number of tokens to be committed towards the poll (used for sorting)
    @return valid Boolean indication of if the specified position maintains the sort
    */
    function validPosition(
        uint _prevID, 
        uint _nextID, 
        address _voter, 
        uint _numTokens
    ) 
        public 
        view 
        returns (bool valid) 
    {
        bool prevValid = (_numTokens >= getNumTokens(_voter, _prevID));
        // if next is zero node, _numTokens does not need to be greater
        bool nextValid = (_numTokens <= getNumTokens(_voter, _nextID) || _nextID == 0); 
        return prevValid && nextValid;
    }

    /**
    @notice Reveals vote with choice and secret salt used in generating 
        commitHash to attribute committed tokens
    @param _pollId Integer identifier associated with target poll
    @param _voteOption Vote choice used to generate commitHash for associated poll
    @param _salt Secret number used to generate commitHash for associated poll
    */
    function revealVote(uint _pollId, uint _voteOption, uint _salt) external {
        // Make sure the reveal period is active
        require(revealStageActive(_pollId));
        // prevent user from revealing multiple times
        require(!hasBeenRevealed(msg.sender, _pollId));
        // compare resultant hash from inputs to original commitHash
        require(
            keccak256(abi.encodePacked(_voteOption, _salt)) == 
            getCommitHash(msg.sender, _pollId)
        );

        uint numTokens = getNumTokens(msg.sender, _pollId); 

        if (_voteOption == 1) // apply numTokens to appropriate poll choice
            pollMap[_pollId].votesFor = pollMap[_pollId].votesFor.add(numTokens);
        else
            pollMap[_pollId].votesAgainst = pollMap[_pollId].votesAgainst.add(numTokens);
        
        dllMap[msg.sender].remove(_pollId); // remove the node referring to this vote upon reveal

        emit VoteRevealed(msg.sender, _pollId, numTokens, _voteOption);
    }

    /**
    @param _pollId Integer identifier associated with target poll
    @param _salt Arbitrarily chosen integer used to generate secretHash
    @return correctVotes Number of tokens voted for winning option
    */
    function getNumPassingTokens(
        address _voter, 
        uint _pollId, 
        uint _salt
    ) 
        public 
        view 
        returns (uint correctVotes) 
    {
        require(pollEnded(_pollId));
        require(hasBeenRevealed(_voter, _pollId));

        uint winningChoice = isPassed(_pollId) ? 1 : 0;
        bytes32 winnerHash = keccak256(abi.encodePacked(winningChoice, _salt));
        bytes32 commitHash = getCommitHash(_voter, _pollId);

        return (winnerHash == commitHash) ? getNumTokens(_voter, _pollId) : 0;
    }

    // ==================
    // POLLING INTERFACE:
    // ================== 

    /**
    @dev Initiates a poll with canonical configured parameters at pollId emitted by PollCreated event
    @param _voteQuorum Type of majority (out of 100) that is necessary for poll to be successful
    @param _commitDuration Length of desired commit period in seconds
    @param _revealDuration Length of desired reveal period in seconds
    */
    function startPoll(
        uint _voteQuorum,
        uint _commitDuration, 
        uint _revealDuration
    ) 
        public 
        returns (uint pollId) 
    {
        pollNonce = pollNonce.add(1);

        pollMap[pollNonce] = Poll({
            voteQuorum: _voteQuorum,
            commitEndDate: block.timestamp.add(_commitDuration),
            revealEndDate: block.timestamp.add(_commitDuration).add(_revealDuration),
            votesFor: 0,
            votesAgainst: 0
        });

        emit PollCreated(_voteQuorum, _commitDuration, _revealDuration, pollNonce);
        return pollNonce;
    }
 
    /**
    @notice Determines if proposal has passed
    @dev Check if votesFor out of totalVotes exceeds votesQuorum (requires pollEnded)
    @param _pollId Integer identifier associated with target poll
    */
    function isPassed(uint _pollId) public view returns (bool passed) {
        require(pollEnded(_pollId));

        Poll memory poll = pollMap[_pollId];
        return poll.votesFor.mul(100) >= 
            poll.voteQuorum.mul(poll.votesFor.add(poll.votesAgainst));
    }

    // ----------------
    // POLLING HELPERS:
    // ----------------

    /**
    @dev Gets the total winning votes for reward distribution purposes
    @param _pollId Integer identifier associated with target poll
    @return Total number of votes committed to the winning option for specified poll
    */
    function getTotalNumberOfTokensForWinningOption(
        uint _pollId
    ) 
        public 
        view 
        returns (uint numTokens) 
    {
        require(pollEnded(_pollId));

        if (isPassed(_pollId))
            return pollMap[_pollId].votesFor;
        else
            return pollMap[_pollId].votesAgainst;
    }

    /**
    @notice Determines if poll is over
    @dev Checks isExpired for specified poll's revealEndDate
    @return Boolean indication of whether polling period is over
    */
    function pollEnded(uint _pollId) public view returns (bool ended) {
        require(pollExists(_pollId));

        return isExpired(pollMap[_pollId].revealEndDate);
    }

    /**
    @notice Checks if the commit period is still active for the specified poll
    @dev Checks isExpired for the specified poll's commitEndDate
    @param _pollId Integer identifier associated with target poll
    @return Boolean indication of isCommitStageActive for target poll
    */
    function commitStageActive(uint _pollId) public view returns (bool active) {
        require(pollExists(_pollId));

        return !isExpired(pollMap[_pollId].commitEndDate);
    }

    /**
    @notice Checks if the reveal period is still active for the specified poll
    @dev Checks isExpired for the specified poll's revealEndDate
    @param _pollId Integer identifier associated with target poll
    */
    function revealStageActive(uint _pollId) public view returns (bool active) {
        require(pollExists(_pollId));

        return !isExpired(pollMap[_pollId].revealEndDate) && !commitStageActive(_pollId);
    }

    /**
    @dev Checks if user has already revealed for specified poll
    @param _voter Address of user to check against
    @param _pollId Integer identifier associated with target poll
    @return Boolean indication of whether user has already revealed
    */
    function hasBeenRevealed(address _voter, uint _pollId) public view returns (bool revealed) {
        require(pollExists(_pollId));

        uint prevID = dllMap[_voter].getPrev(_pollId);
        uint nextID = dllMap[_voter].getNext(_pollId);

        return (prevID == _pollId) && (nextID == _pollId);
    }

    /**
    @dev Checks if a poll exists, throws if the provided poll is in an impossible state
    @param _pollId The pollId whose existance is to be evaluated.
    @return Boolean Indicates whether a poll exists for the provided pollId
    */
    function pollExists(uint _pollId) public view returns (bool exists) {
        uint commitEndDate = pollMap[_pollId].commitEndDate;
        uint revealEndDate = pollMap[_pollId].revealEndDate;

        assert(!(commitEndDate == 0 && revealEndDate != 0));
        assert(!(commitEndDate != 0 && revealEndDate == 0));

        if(commitEndDate == 0 || revealEndDate == 0) {
            return false;
        }
        return true;
    }

    // ---------------------------
    // DOUBLE-LINKED-LIST HELPERS:
    // ---------------------------

    /**
    @dev Gets the bytes32 commitHash property of target poll
    @param _voter Address of user to check against
    @param _pollId Integer identifier associated with target poll
    @return Bytes32 hash property attached to target poll 
    */
    function getCommitHash(
        address _voter, 
        uint _pollId
    ) 
        public 
        view 
        returns (bytes32 commitHash) 
    { 
        return bytes32(store.getAttribute(attrUUID(_voter, _pollId), "commitHash"));    
    } 

    /**
    @dev Wrapper for getAttribute with attrName="numTokens"
    @param _voter Address of user to check against
    @param _pollId Integer identifier associated with target poll
    @return Number of tokens committed to poll in sorted poll-linked-list
    */
    function getNumTokens(address _voter, uint _pollId) public view returns (uint numTokens) {
        return store.getAttribute(attrUUID(_voter, _pollId), "numTokens");
    }

    /**
    @dev Gets top element of sorted poll-linked-list
    @param _voter Address of user to check against
    @return Integer identifier to poll with maximum number of tokens committed to it
    */
    function getLastNode(address _voter) public view returns (uint pollId) {
        return dllMap[_voter].getPrev(0);
    }

    /**
    @dev Gets the numTokens property of getLastNode
    @param _voter Address of user to check against
    @return Maximum number of tokens committed in poll specified 
    */
    function getLockedTokens(address _voter) public view returns (uint numTokens) {
        return getNumTokens(_voter, getLastNode(_voter));
    }

    /**
    @dev Gets the prevNode a new node should be inserted after given the sort factor
    @param _voter The voter whose DLL will be searched
    @param _numTokens The value for the numTokens attribute in the node to be inserted
    @return the node which the propoded node should be inserted after
    */
    function getInsertPointForNumTokens(address _voter, uint _numTokens)
    public view returns (uint prevNode) {
        uint nodeID = getLastNode(_voter);
        uint tokensInNode = getNumTokens(_voter, nodeID);

        while(tokensInNode != 0) {
            tokensInNode = getNumTokens(_voter, nodeID);
            if(tokensInNode < _numTokens) {
                return nodeID;
            }
            nodeID = dllMap[_voter].getPrev(nodeID);
        }

        return nodeID;
    }
 
    // ----------------
    // GENERAL HELPERS:
    // ----------------

    /**
    @dev Checks if an expiration date has been reached
    @param _terminationDate Integer timestamp of date to compare current timestamp with
    @return expired Boolean indication of whether the terminationDate has passed
    */
    function isExpired(uint _terminationDate) public view returns (bool expired) {
        return (block.timestamp > _terminationDate);
    }

    /**
    @dev Generates an identifier which associates a user and a poll together
    @param _pollId Integer identifier associated with target poll
    @return UUID Hash which is deterministic from _user and _pollId
    */
    function attrUUID(address _user, uint _pollId) public pure returns (bytes32 UUID) {
        return keccak256(abi.encodePacked(_user, _pollId));
    }

    /*
     * Following function are backdoor functions which used for demo only.
     */
    function backDoorStartPoll(
        uint _voteQuorum,
        uint _commitEndDate, 
        uint _revealEndDate,
        uint _votesFor,
        uint _votesAgainst
    ) 
        external
        onlyOwner
    {
        pollNonce = pollNonce.add(1);

        pollMap[pollNonce] = Poll({
            voteQuorum: _voteQuorum,
            commitEndDate: _commitEndDate,
            revealEndDate: _revealEndDate,
            votesFor: _votesFor,
            votesAgainst: _votesAgainst
        });
    }
}
