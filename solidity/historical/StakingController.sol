pragma solidity ^0.4.23;

import './ProjectMeta.sol';
import './SafeMath.sol';
import './ERC20.sol';

contract StakingController {

    using SafeMath for uint;

    ProjectMeta public projectMeta;

    mapping(uint8 => mapping(address => uint)) staked;
    mapping(uint8 => uint) totalStaked;

    function setProjectMeta(address projectMetaAddr) external {
        projectMeta = ProjectMeta(projectMetaAddr);
    }

    function stake(uint8 id, uint val) external {
        ERC20 token = ERC20(projectMeta.getAddress(keccak256("contract.name", "ERC20")));
        require(token.transferFrom(msg.sender, address(this), val));
        staked[id][msg.sender] = staked[id][msg.sender].add(val);
        totalStaked[id] = totalStaked[id].add(val);
    }

    function stakingAmount(uint8 id, address investor) external view returns (uint) {
        return staked[id][investor];
    }

    function totalStakingAmount(uint8 id) external view returns (uint) {
        return totalStaked[id];
    }
}
