# Registry

### function apply(string _projectName, uint _amount)
  Allows a user to start an application.             
  Takes tokens from user and sets apply stage end time.
  - @param _projectName      The project name of a potential listing a user is applying to add to the registry
  - @param _amount      The number of ERC20 tokens a user is willing to potentially stake
  
### function deposit(string _projectName, uint _amount)
  Allows the owner of a projectName to increase their unstaked deposit.
  - @param _projectName      The projectName of a user's application/listing
  - @param _amount      The number of ERC20 tokens to increase a user's unstaked deposit
  
### function withdraw(string _projectName, uint _amount)
  Allows the owner of a projectName to decrease their unstaked deposit.
  The listing keeps its previous status.
  - @param _projectName      The projectName of a user's application/listing
  - @param _amount      The number of ERC20 tokens to decrease a user's unstaked deposit
  
### function exit(string _projectName)  
  Allows the owner of a listing to remove the listing from the whitelist
  Returns all tokens to the owner of the listing
  - @param _projectName      The projectName of a user's listing
  
### function challenge(string _projectName) external returns (uint challengeID)
  Starts a poll for a projectName which is either
  in the apply stage or already in the whitelist.
  Tokens are taken from the challenger and the applicant's deposit is locked.
  - @param _projectName      The projectName of an applicant's potential listing

### function claimReward(uint _challengeID, uint _salt)
  Called by a voter to claim his/her reward for each completed vote.
  Someone must call updateStatus() before this can be called.
  - @param _challengeID The pollID of the challenge a reward is being claimed for
  - @param _salt        The salt of a voter's commit hash in the given poll
  
### function updateStatus(string _projectName)
  Updates a projectName's status from 'application' to 'listing'
  or resolves a challenge if one exists.
  - @param _projectName      The projectName whose status is being updated
  
### function isWhitelisted(string _projectName) constant public returns (bool whitelisted)
  returns true if projectName is whitelisted

### function appWasMade(string _projectName) constant public returns (bool exists)
  returns true if apply was called for this projectName
   
### function challengeExists(string _projectName) constant public returns (bool)
  returns true if the application/listing has an unresolved challenge
   
### function challengeWinnerReward(uint _challengeID) public constant returns (uint)
  Determines the number of tokens awarded to the winning party in a challenge.
  - @param _challengeID The challengeID to determine a reward for
  
### function isExpired(uint _termDate) constant public returns (bool expired)
  returns true if the provided termDate has passed
  
### function voterReward(address _voter, uint _challengeID, uint _salt) public constant returns (uint)
  Calculates the provided voter's token reward for the given poll.
  - @param _voter       The address of the voter whose reward balance is to be returned
  - @param _challengeID The ID of the challenge the voter's reward is being calculated for
  - @param _salt        The salt of the voter's commit hash in the given poll
  - @return             The uint indicating the voter's reward (in nano-VTH)

### function tokenClaims(uint _challengeID, address _voter) public constant returns (bool)
  Determines whether the provided voter has claimed tokens in a challenge
  - @param _challengeID The ID of the challenge to determine whether a voter has claimed tokens for
  - @param _voter       The address of the voter whose claim status is to be determined for the provided challenge.
  - @return             Bool indicating whether the voter has claimed tokens in the provided challenge

### function listings(bytes32 _projectName) public returns (struct Listing)
  Maps projectNameHashes to associated listing data
  ```
  struct Listing {
    uint applicationExpiry; // Expiration date of apply stage
    bool whitelisted;       // Indicates registry status
    address owner;          // Owner of Listing
    uint unstakedDeposit;   // Number of unlocked tokens with potential risk if challenged
    uint challengeID;       // Identifier of canonical challenge
  }
  ```
  Note that this function returns a tuple (e.g. (applicationExpiry, whitelisted, ...)) instead of a Listing struct
### function getChallengeData(bytes32 _projectName)
  returns a flattened Challenge.Data (see Challenge section) 
  ```
    uint rewardPool;        // (remaining) Pool of tokens distributed amongst winning voters
    PLCRVoting voting;      // Address of a PLCRVoting contract
    StandardToken token;    // Address of an ERC20 token contract
    uint challengeID;       // An ID corresponding to a pollID in the PLCR contract
    address challenger;     // Owner of Challenge
    bool resolved;          // Indication of if challenge is resolved
    uint stake;             // Number of tokens at risk for either party during challenge
    uint winningTokens;     // (remaining) Amount of tokens used for voting by the winning side
   ```
# Challenge
```
  // ------
  // DATA STRUCTURES
  // ------

  struct Data {
    uint rewardPool;        // (remaining) Pool of tokens distributed amongst winning voters
    PLCRVoting voting;      // Address of a PLCRVoting contract
    StandardToken token;    // Address of an ERC20 token contract
    uint challengeID;       // An ID corresponding to a pollID in the PLCR contract
    address challenger;     // Owner of Challenge
    bool resolved;          // Indication of if challenge is resolved
    uint stake;             // Number of tokens at risk for either party during challenge
    uint winningTokens;     // (remaining) Amount of tokens used for voting by the winning side
    mapping(address =>
            bool) tokenClaims; // maps addresses to token claim data for this challenge
  }
```

### function isInitialized() constant public returns (bool)
  returns true if the application/listing is initialized

### function isResolved() constant public returns (bool)
  returns true if the application/listing has a resolved challenge
  
### function canBeResolved() constant public returns (bool)
  determines whether voting has concluded in a challenge for a given projectName. Throws if no challenge exists.
  
### function challengeWinnerReward() public constant returns (uint) 
  determines the number of tokens awarded to the winning party in a challenge.
  
### function voterReward(address _voter, uint _salt) public constant returns (uint)
  Calculates the provided voter's token reward for the given poll.
  - @param _voter       The address of the voter whose reward balance is to be returned
  - @param _salt        The salt of the voter's commit hash in the given poll
  - @return             The uint indicating the voter's reward (in nano-VTH)

### function claimReward(address _voter, uint _salt) public returns (uint)
  called by a voter to claim his/her reward for each completed vote.
  - @param _voter the address of the voter to claim a reward for
  - @param _salt the salt of a voter's commit hash in the given poll

