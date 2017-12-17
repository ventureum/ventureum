pragma solidity ^0.4.18;

import './ERC20.sol';
import './VTHManager.sol';
import './Ventureum.sol';
import './ProjectMeta.sol';

contract ProjectMetaWithVTH is ProjectMeta {

    VTHManager public _VTHManager;

    // ventureum meta contract
    Ventureum public ven;

    function ProjectMetaWithVTH(string name) ProjectMeta(name) public {}

    function setVTHManager(address addr) external {
        _VTHManager = VTHManager(addr);
    }

    function setVentureum(address addr) external {
        ven = Ventureum(addr);
    }
}
