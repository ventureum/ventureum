pragma solidity ^0.4.23;

interface ICriteriaController {
    /**
     * Returns a decision for a milestone
     *
     * @param id The ID of a milestone
     * @return 0: postponed, 1: accepted, 2: rejected
     */
    function getDecision(uint8 id) public view returns (uint);

    /**
     * Add a criterion
     *
     * @param criterion The address of a Criterion contract
     */
    function addCriterion(address criterion) public;
}
