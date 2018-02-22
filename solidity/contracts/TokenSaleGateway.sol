pragma solidity ^0.4.18;

import './SafeMath.sol';
import './Ownable.sol';
import './ERC20.sol';
import './ETHCollector.sol';
import './Crowdsale.sol';
import './Milestones.sol';

contract TokenSaleGateway {
    using SafeMath for uint;

    // project meta info
    ProjectMeta public projectMeta;

    enum Stages {
        Inactive,
        Accepting,
        Finished
    }

    // This is the current stage.
    Stages public stage = Stages.Inactive;

    mapping(address => uint) weiAmountByAddr;

    uint public weiAmount = 0;
    uint public constant softCap = 0;

    // starting time and ending time set by
    // project founders
    uint constant public startingTime = 0;
    uint constant public endingTime = 0;

    modifier atStage(Stages _stage) {
        require(stage == _stage);
        _;
    }

    function nextStage() internal {
        stage = Stages(uint(stage) + 1);
    }

    modifier timedTransitions() {
        if (stage == Stages.Inactive &&
            now >= startingTime && now < endingTime)
            nextStage();
        if (stage == Stages.Accepting &&
            now >= endingTime)
            nextStage();
        // The other stages transition by transaction
        _;
    }

    function TokenSaleGateway(address projectMetaAddr) public {
        projectMeta = ProjectMeta(projectMetaAddr);
    }

    function () public payable timedTransitions atStage(Stages.Accepting) {
        address collectorAddr = projectMeta.getAddress(keccak256("contract.name", "ETHCollector"));
        ETHCollector ethCollector = ETHCollector(collectorAddr);
        collectorAddr.transfer(msg.value);
        ethCollector.deposit(msg.value);
        
        Crowdsale crowdsale = Crowdsale(projectMeta.getAddress(keccak256("contract.name", "Crowdsale")));
        crowdsale.registerPurchase(msg.sender, msg.value);

        weiAmount = weiAmount.add(msg.value);

        weiAmountByAddr[msg.sender] = weiAmountByAddr[msg.sender].add(msg.value);
    }

    function setUpMilestone() external timedTransitions atStage(Stages.Finished) {
        require(projectMeta.accessibleBy(keccak256("TokenSaleGateway.setUpMilestone"), msg.sender));
        require(weiAmount >= softCap);

        Milestones milestones = Milestones(projectMeta.getAddress(keccak256("contract.name", "Milestones")));
        uint total = weiAmount;
        uint n = milestones.getMilestoneCount();
        uint8 i;
        uint weiRequired;
        for(i=0; i < n; i++) {
            weiRequired = milestones.getWeiRequired(i);
            if (weiRequired > 0) {
                milestones.setWeiLocked(i, weiRequired);
                total = total.sub(weiRequired);
            }
        }

        for(i=0; i < n; i++) {
            weiRequired = milestones.getWeiRequired(i);
            if (weiRequired == 0) {
                uint tmp = (milestones.getPercentage(i).mul(total)).sub(100);
                milestones.setWeiLocked(i, tmp);
            }
        }
    }

    function refund() external timedTransitions atStage(Stages.Finished) {
        require(weiAmount < softCap);
        uint amount =  weiAmountByAddr[msg.sender];
        weiAmountByAddr[msg.sender] = 0;
        msg.sender.transfer(amount);
    }
}
