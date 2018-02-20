pragma solidity ^0.4.18;

import './SafeMath.sol';
import './Ownable.sol';
import './ERC20.sol';
import './ETHCollector.sol';
import './Crowdsale.sol';

contract TokenSaleGateway {
    using SafeMath for uint;

    // project meta info
    ProjectMeta public projectMeta;

    uint weiAmount = 0;

    function TokenSaleGateway(address projectMetaAddr) public {
        projectMeta = ProjectMeta(projectMetaAddr);
    }

    function () public payable {
        address collectorAddr = projectMeta.getAddress(keccak256("contract.name", "ETHCollector"));
        ETHCollector ethCollector = ETHCollector(collectorAddr);
        collectorAddr.transfer(msg.value);
        ethCollector.deposit(msg.value);
        
        Crowdsale crowdsale = Crowdsale(projectMeta.getAddress(keccak256("contract.name", "Crowdsale")));
        crowdsale.registerPurchase(msg.sender, msg.value);

        weiAmount = weiAmount.add(msg.value);
    }

    function setUpMilestone() external {
        require(projectMeta.accessibleBy(keccak256("TokenSaleGateway.setUpMilestone"), msg.sender));
        // TODO
    }
}
