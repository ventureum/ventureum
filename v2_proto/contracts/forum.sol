pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./RepSys.sol";

contract Forum {
    struct Post {
        bytes16 actor;  // 128-bit uuid
        bytes32 boardId;
        bytes32 parentHash;
        bytes32 postHash;
        bytes4 typeHash;
        string contentTitle;
        string contentText;
        string contentSubtitle;
        string contentImage;
        string contentMeta;
    }

    struct PostVoter {
        bytes16 actor;
        int val;
    }

    struct PostVoteInfo {
        PostVoter[] voters;
        int medium;
    }

    mapping(bytes32 => Post) posts;

    function newPost (
        bytes16 actor,
        bytes32 boardId,
        bytes32 parentHash,
        bytes32 postHash,
        bytes4 typeHash,
        string contentTitle,
        string contentText,
        string contentSubtitle,
        string contentImage,
        string contentMeta)
        external
    {
        // require(actor == msg.sender); // auth
    }

    function upvote(bytes16 actor, bytes32 postHash, int value) {
        
    }
}
