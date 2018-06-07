pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

import "./Handler.sol";
import "./IContractAddressHandler.sol";
import "../modules/managers/IManager.sol";

contract ContractAddressHandler is IContractAddressHandler, Handler, Ownable {

    // CI => contract address
    mapping (bytes32 => address) public contracts;

    // contract address => CI
    mapping (address => bytes32) public reverseLookUp;

    constructor (address kernelAddr) Handler(kernelAddr) public {
        CI = keccak256("ContractAddressHandler");
    }

    function contracts(bytes32 _CI) public view returns (address) {
        return contracts[_CI];
    }

    function reverseLookUp(address addr) public view returns (bytes32) {
        return reverseLookUp[addr];
    }

    /*
      Register a contract

      @param CI Contract Identifier (CI)
      @param addr address of the contract
    */
    function registerContract(bytes32 _CI, address addr) external onlyOwner {
        require(contracts[_CI] == address(0x0));

        contracts[_CI] = addr;
        reverseLookUp[addr] = _CI;
    }

    /*
      Unregister a contract

      @param CI Contract Identifier (CI)
    */
    function unregisterContract(bytes32 _CI) external onlyOwner {
        require(contracts[_CI] != address(0x0));

        delete reverseLookUp[contracts[_CI]];
        delete contracts[_CI];

        // TODO notify
    }

    function verifyController(bytes32[] _controllerList) internal view {
        for(uint i = 0; i < _controllerList.length; i++) {
            address controllerAddr = contracts[_controllerList[i]];
            require(controllerAddr != address(0x0));
            require(IHandler(controllerAddr).isConnected());
        }
    }

    function connect(address contractAddr, bytes32[] _controllerList) external onlyOwner {
        verifyController(_controllerList);
        require(IManager(contractAddr).isConnected());
        for(uint i = 0; i < _controllerList.length; i++) {
            IManager(contractAddr).setController(_controllerList[i], contracts[_controllerList[i]]);
        }
    }

    function disconnect(address contractAddr, bytes32[] _controllerList) external onlyOwner {
        verifyController(_controllerList);
        require(IManager(contractAddr).isConnected());
        for(uint i = 0; i < _controllerList.length; i++) {
            IManager(contractAddr).setController(_controllerList[i], address(0x0));
        }
    }
}
