pragma solidity ^0.4.18;

import './SafeMath.sol';
import './ProjectMeta.sol';

contract ETHCollector {

    using SafeMath for uint;

    // project meta info
    ProjectMeta public projectMeta;

    uint value;

    function ETHCollector(address projectMetaAddr) public {
        projectMeta = ProjectMeta(projectMetaAddr);
    }

    function deposit(uint val) payable external {
        require(projectMeta.accessibleBy(keccak256("ETHCollector.deposit"), msg.sender));
        value = value.add(val);
    }

    function withdraw(address addr, uint val) external {
        require(projectMeta.accessibleBy(keccak256("ETHCollector.withdraw"), msg.sender));
        require(val <= value);
        value = value.sub(val);
        addr.transfer(val);
    }
}
