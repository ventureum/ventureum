pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract RepSys {

    using SafeMath for uint;

    struct Profile {
        bool init;
        bytes4 userType;
        uint reputation;
    }

    struct Delegation {
        uint votes; // available votes to be delegated
        uint receivedVotes;
        uint usedVotesPct;
        address[] proxyList;
        mapping(address => uint) votesCasted; // votes casted for each proxy
    }

    mapping(bytes32 => mapping(address => Delegation)) delegation;
    mapping(address => Profile) profile;

    uint constant INIT_REPUTATION = 1000;

    address public owner;

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    constructor() public {
        owner = msg.sender;
    }

    function registerUser(address user, bytes4 userType, uint reputation) external onlyOwner {
        Profile storage p = profile[user];

        p.init = true;
        p.userType = userType;
        p.reputation = reputation;
    }

    function getProfile(address user) external view returns (bool, bytes4, uint) {
        Profile storage p = profile[user];
        return (p.init, p.userType, p.reputation);
    }

    function getWeight(address user) external view returns (uint) {
        return profile[user].reputation;
    }

    function getDelegation(bytes32 projectId, address user) external view returns (uint, uint ,uint) {
        Delegation storage d = delegation[projectId][user];
        return (d.votes, d.receivedVotes, d.usedVotesPct);
    }

    function updateDelegation(bytes32 projectId, address principal, address proxy, uint pos, uint neg) public {
        Delegation storage d = delegation[projectId][proxy];

        d.receivedVotes = d.receivedVotes.add(pos).sub(neg);
    }

    function writeVotes(bytes32 projectId, address user, uint val) external {
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
                pos.mul(d.votesCasted[proxy]).div(100),
                neg.mul(d.votesCasted[proxy]).div(100));
        }
    }

    function delegate(bytes32 projectId, address proxy, uint pct) external {
        require(0 <= pct && pct <= 100, "Invalid percentage");
        Delegation storage d = delegation[projectId][msg.sender];

        if (d.votesCasted[proxy] == 0 && pct > 0) {
            // new proxy added to the list
            d.proxyList.push(proxy);
        }

        if (d.votesCasted[proxy] > 0 && pct == 0) {
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

        if (pct >= d.votesCasted[proxy]) {
            require (d.usedVotesPct.add(pct.sub(d.votesCasted[proxy])) <= 100, "Cannot exceed 100%");
            d.usedVotesPct = d.usedVotesPct.add(pct.sub(d.votesCasted[proxy]));

            // update proxy's votes
            updateDelegation(projectId, msg.sender, proxy, d.votes.mul(pct.sub(d.votesCasted[proxy])), 0);
        } else {
            // require is not required since we have safemath
            d.usedVotesPct = d.usedVotesPct.sub(d.votesCasted[proxy].sub(pct));
            updateDelegation(projectId, msg.sender, proxy, 0, d.votes.mul(d.votesCasted[proxy].sub(pct)));
        }

        d.votesCasted[proxy] = pct;
    }
}
