pragma solidity ^0.4.18;

interface ICriterionsController {
    // Returns a decision on whether a milestone is accepted, postponsed or rejected
    function getDecision(uint8 id) public returns (uint);

    // Add a criterion
    function addCriterion(ICriterion criterion) public;
}
