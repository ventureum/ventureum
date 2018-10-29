pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract RepSys {

    using SafeMath for uint;

    event RegisterUser(bytes16 uuid, address publicKey, bytes4 userType, uint reputation, string meta);
    event UnregisterUser(address publicKey);
    event UpdateDelegation(bytes32 projectId, address principal, address proxy, uint pos, uint neg);
    event WriteVotes(bytes32 projectId, address user, uint val);
    event Delegate(bytes32 projectId, address principal, address proxy, uint votesInPercent);

    struct Profile {
        bytes16 uuid;
        bytes4 userType;
        uint reputation;
    }

    struct Delegation {
        uint votes; // available votes to be delegated
        uint receivedVotes;
        uint usedVotesPct;
        address[] proxyList;
        mapping(address => uint) votesPctCasted; // votes pct casted for each proxy
    }

    address[] public validators;

    mapping(bytes32 => mapping(address => Delegation)) delegation;
    mapping(address => Profile) profile;

    uint constant INIT_REPUTATION = 1000;

    address public owner;

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    modifier registered(address user) {
        require(profile[user].userType != bytes4(0x0));
        _;
    }

    constructor() public {
        owner = msg.sender;
    }

    function calVotes(uint votes, uint pct) internal returns (uint) {
        return (votes.mul(pct)).div(100);
    }

    /**
     * Register a user
     * @param user address of a user
     * @param userType type of a user, set to 0 to unregister the user
     * @param reputation init value of reputation
     */
    function registerUser(bytes16 uuid, address user, bytes4 userType, uint reputation, string meta) external {
        Profile storage p = profile[user];

        if (userType != bytes4(keccak256("USER"))) {
            // special user can only be added by admin
            require(msg.sender == owner);
            //validators.push(user);
            if (userType == bytes4(keccak256("KOL"))) {
                // add to global validator list
                validators.push(user);
            }
            p.uuid = uuid;
            p.userType = userType;
            p.reputation = reputation;
        } else {
            p.uuid = uuid;
            p.userType = userType;
            p.reputation = INIT_REPUTATION;
        }

        emit RegisterUser(p.uuid, user, p.userType, p.reputation, meta);
    }

    function getValidatorCount() public returns (uint) {
        return validators.length;
    }

    function unregisterUser(address user) external {
        Profile storage p = profile[user];

        if (p.userType != bytes4(keccak256("USER"))) {
            // special user can only be removed by admin
            require(msg.sender == owner);

            if (p.userType == bytes4(keccak256("KOL"))) {
                // remove it from the global validator list
                uint target = validators.length;
                for(uint i = 0; i < validators.length; i++) {
                    if (validators[i] == user) {
                        target = i;
                        break;
                    }
                }
                require(target < validators.length, "KOL not found in validator list");
                validators[target] = validators[validators.length - 1];
                validators.length--;
            }
        } else {
            require (msg.sender == user);
        }

        delete p.userType;

        emit UnregisterUser(user);
    }

    function getProfile(address user) public view returns (bytes4, uint) {
        Profile storage p = profile[user];
        return (p.userType, p.reputation);
    }

    function getWeight(address user) public view returns (uint) {
        return profile[user].reputation;
    }

    function getDelegation(bytes32 projectId, address user) public view returns (uint, uint ,uint) {
        Delegation storage d = delegation[projectId][user];
        return (d.votes, d.receivedVotes, d.usedVotesPct);
    }

    function updateDelegation(bytes32 projectId, address principal, address proxy, uint pos, uint neg) internal {
        Delegation storage d = delegation[projectId][proxy];

        d.receivedVotes = d.receivedVotes.add(pos).sub(neg);

        emit UpdateDelegation(projectId, principal, proxy, pos, neg);
    }

    function writeVotes(bytes32 projectId, address user, uint val) external onlyOwner registered(user) {
        Delegation storage d = delegation[projectId][user];
        uint pos = 0;
        uint neg = 0;

        // calculate diff
        if (val >= d.votes) {
            pos = val.sub(d.votes);
        } else {
            neg = d.votes.sub(val);
        }

        // update votes
        d.votes = val;

        for(uint i = 0; i < d.proxyList.length; i++) {
            address proxy = d.proxyList[i];
            // update votes for principals
            updateDelegation(
                             projectId,
                             user,
                             proxy,
                             pos.mul(d.votesPctCasted[proxy]).div(100),
                             neg.mul(d.votesPctCasted[proxy]).div(100));
        }

        emit WriteVotes(projectId, user, val);
    }

    function delegate(bytes32 projectId, address proxy, uint pct) external {
        require(0 <= pct && pct <= 100, "Invalid percentage");
        Delegation storage d = delegation[projectId][msg.sender];

        if (d.votesPctCasted[proxy] == 0 && pct > 0) {
            // new proxy added to the list
            d.proxyList.push(proxy);
        }

        if (d.votesPctCasted[proxy] > 0 && pct == 0) {
            uint target = 0;
            // remove proxy from the list
            for(uint i = 0; i < d.proxyList.length; i++) {
                if (d.proxyList[i] == proxy) {
                    target = i;
                    break;
                }
            }
            d.proxyList[target] = d.proxyList[d.proxyList.length - 1];
            d.proxyList.length--;
        }

        if (pct >= d.votesPctCasted[proxy]) {
            require (d.usedVotesPct.add(pct.sub(d.votesPctCasted[proxy])) <= 100, "Cannot exceed 100%");
            d.usedVotesPct = d.usedVotesPct.add(pct.sub(d.votesPctCasted[proxy]));

            // update proxy's votes
            updateDelegation(projectId, msg.sender, proxy, calVotes(d.votes, pct.sub(d.votesPctCasted[proxy])), 0);
        } else {
            // require is not required since we have safemath
            d.usedVotesPct = d.usedVotesPct.sub(d.votesPctCasted[proxy].sub(pct));
            updateDelegation(projectId, msg.sender, proxy, 0, calVotes(d.votes, d.votesPctCasted[proxy].sub(pct)));
        }

        d.votesPctCasted[proxy] = pct;

        emit Delegate(projectId, msg.sender, proxy, pct);
    }

    // sort proxies by reputation
    function sortValidators(bytes32 projectId) internal {
        quickSort(projectId, validators, int(0), int(validators.length - 1));
    }

    function getSortWeight(bytes32 projectId, address proxy) internal returns (uint) {
        return delegation[projectId][proxy].receivedVotes;
    }

    function quickSort(bytes32 projectId, address[] storage arr, int left, int right) internal {
        int i = left;
        int j = right;
        if(i == j) return;
        uint pivot = uint(left + (right - left) / 2);
        uint pivotVal = getSortWeight(projectId, arr[pivot]);
        uint iVal;
        uint jVal;
        while (i <= j) {
            iVal = getSortWeight(projectId, arr[uint(i)]);
            jVal = getSortWeight(projectId, arr[uint(j)]);
            while (iVal > pivotVal) {
                i++;
                iVal = getSortWeight(projectId, arr[uint(i)]);
            }
            while (pivotVal > jVal) {
                j--;
                jVal = getSortWeight(projectId, arr[uint(j)]);
            }
            if (i <= j) {
                (arr[uint(i)], arr[uint(j)]) = (arr[uint(j)], arr[uint(i)]);
                i++;
                j--;
            }
        }
        if (left < j)
            quickSort(projectId, arr, left, j);
        if (i < right)
            quickSort(projectId, arr, i, right);
    }

    function getTopValidators(bytes32 projectId) external returns (address[]) {
        sortValidators(projectId);
        return validators;
    }
}
