pragma solidity ^0.4.18;

import './ProjectMeta.sol';
import './ICriteriaController.sol';
import './ICriterion.sol';
import './IBearMarketIndicator.sol';

contract CriteriaController is ICriteriaController {

    ProjectMeta public projectMeta;

    mapping(uint8 => ICriterion[]) criteria;

    function getDecision(uint8 id) public view returns (uint) {
        // must have at least one criterion
        require(criteria[id].length > 0);

        if (criteria[id].length == 1 && criteria[id][0].t() == 0) {
            // special case: only vote criterion is applied
            if (criteria[id][0].satisfied(id)) {
                // accepted
                return 1;
            }
            IBearMarketIndicator indicator =  IBearMarketIndicator(projectMeta.getAddress(keccak256("contract.name", "IBearMarketIndicator")));
            if (indicator.isBearMarket()) {
                // postponed
                return 0;
            }

            // rejected
            return 2;
        }

        for (uint8 i = 0; i < criteria[id].length; i++) {
            if (criteria[id][i].satisfied(id)) {
                // accepted if at least one criterion is satisfied
                return 1; 
            }
        }

        // rejected
        return 2;
    }

    function addCriterion(uint8 id, address criterion) public {
        criteria[id].push(ICriterion(criterion));
    }
}
