pragma solidity ^0.4.18;

import './SafeMath.sol';
import './ProjectMeta.sol';
import './ERC20.sol';

contract TokenCollector {

    using SafeMath for uint;

    // project meta info
    ProjectMeta public projectMeta;

    uint value;

    function TokenCollector(address projectMetaAddr) public {
        projectMeta = ProjectMeta(projectMetaAddr);
    }

    function deposit(uint val) external {
        require(projectMeta.accessibleBy(keccak256("TokenCollector.deposit"), msg.sender));
        ERC20 token = ERC20(projectMeta.getAddress(keccak256("contract.name", "ERC20")));
        require(token.transferFrom(msg.sender, address(this), val));
        value = value.add(val);
    }

    function withdraw(address addr, uint val) external {
        require(projectMeta.accessibleBy(keccak256("TokenCollector.withdraw"), msg.sender));
        require(val <= value);
        ERC20 token = ERC20(projectMeta.getAddress(keccak256("contract.name", "ERC20")));
        value = value.sub(val);
        require(token.transfer(addr, val));
    }
}
