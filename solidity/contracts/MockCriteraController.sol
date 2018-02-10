pragma solidity ^0.4.18;

import './ICriteriaController.sol';

contract MockCriteriaController is ICriteriaController {

    mapping(uint8 => uint) decision;

    function setDecision(uint8 id, uint val) public {
        decision[id] = val;
    }
    
    function getDecision(uint8 id) public view returns (uint) {
        return decision[id];
    }

    function addCriterion(address criterion) public {}
}
