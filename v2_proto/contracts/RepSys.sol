pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract RepSys {

    using SafeMath for uint;

    struct Profile {
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

    constructor () public {
        owner = msg.sender;
    }

    function calVotes(uint votes, uint pct) internal returns (uint) {
        return (votes.mul(pct)).div(100);
    }

    /**
     * Register/unregister a user
     * @param user address of a user
     * @param userType type of a user, set to 0 to unregister the user
     * @param reputation init value of reputation
     */
    function registerUser(address user, bytes4 userType, uint reputation) external onlyOwner {
        Profile storage p = profile[user];

        p.userType = userType;
        p.reputation = reputation;
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
    }
}
