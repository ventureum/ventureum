pragma solidity ^0.4.24;

import "../Module.sol";
import "./ProjectControllerStorage.sol";
import "../ether_collector/EtherCollector.sol";


contract ProjectController is Module {
    // events
    event ProjectRegistered(
        address indexed sender,
        bytes32 namespace,
        address indexed owner,
        address indexed tokenAddress
    );
    event ProjectUnregistered(address indexed sender, bytes32 namespace);
    event ProjectStateSet(address indexed sender, bytes32 namespace, uint projectState);
    event ProjectControllerStoreSet(
        address indexed sender,
        bytes32 projectControllerCI,
        bytes32 projectControllerStorageCI,
        address indexed store
    );
    event ProjectTokenSet(address indexed sender, bytes32 namespace, address tokenAddress);

    /*
      1. Can only add state in order but before LENGTH
      2. Do not delete or rearrange states
      3. If you want to depreciate a state, add comment like
         // @depreciated
         SOME_STATE
    */
    enum ProjectState {
        NotExist,
        AppSubmitted,
        AppAccepted,
        TokenSale,
        Milestone,
        Complete,
        LENGTH
    }

    address constant ZERO_ADDRESS = address(0x0);
    bytes32 constant ZERO_BYTES32 = keccak256("-1");

    bytes32 constant OWNER = keccak256("owner");
    bytes32 constant TOKEN_ADDRESS = keccak256("tokenAddress");
    bytes32 constant PROJECT_STATE = keccak256("projectState");
    bytes32 constant NAMESPACE = keccak256("namespace");

    ProjectControllerStorage private projectControllerStore;

    constructor (address kernelAddr) Module(kernelAddr) public {
        CI = keccak256("ProjectController");
    }

    /**
    * Register a project
    *
    * @param namespace namespace of a project
    * @param owner the owner address for the project
    * @param tokenAddress the token address for the project
    */
    function registerProject(bytes32 namespace, address owner, address tokenAddress)
        external
        connected
    {
        (bool existing,) = isExisting(namespace);
        require(!existing);

        projectControllerStore.setAddress(
            keccak256(abi.encodePacked(namespace, OWNER)), 
            owner
        );
        projectControllerStore.setAddress(
            keccak256(abi.encodePacked(namespace, TOKEN_ADDRESS)), 
            tokenAddress
        );
        projectControllerStore.setUint(
            keccak256(abi.encodePacked(namespace, PROJECT_STATE)),
            uint256(ProjectState.AppSubmitted)
        );
        projectControllerStore.setBytes32(
            keccak256(abi.encodePacked(owner, NAMESPACE)), 
            namespace
        );

        emit ProjectRegistered(msg.sender, namespace, owner, tokenAddress);
    }

    /**
    * Unregister a project
    *
    * @param namespace namespace of a project
    */
    function unregisterProject(bytes32 namespace) external connected {
        (bool existing, address owner) = isExisting(namespace);
        require(existing);

        projectControllerStore.setAddress(
            keccak256(abi.encodePacked(namespace, OWNER)), 
            ZERO_ADDRESS
        );
        projectControllerStore.setAddress(
            keccak256(abi.encodePacked(namespace, TOKEN_ADDRESS)), 
            ZERO_ADDRESS
        );
        projectControllerStore.setUint(
            keccak256(abi.encodePacked(namespace, PROJECT_STATE)),
            uint256(ProjectState.NotExist)
        );
        projectControllerStore.setBytes32(
            keccak256(abi.encodePacked(owner, NAMESPACE)), 
            ZERO_BYTES32
        );

        emit ProjectUnregistered(msg.sender, namespace);
    }

    /**
    * Set the state of a project
    *
    * @param namespace namespace of a project
    * @param projectState state of the project
    */
    function setState(bytes32 namespace, uint projectState) external connected {
        (bool existing,) = isExisting(namespace);
        require(existing);
        require(projectState >= 0 && projectState <= uint(ProjectState.LENGTH));

        projectControllerStore.setUint(
            keccak256(abi.encodePacked(namespace, PROJECT_STATE)), 
            uint256(projectState)
        );

        emit ProjectStateSet(msg.sender, namespace, projectState);
    }

    /**
    * @notice Set token address of a project
    * @param tokenAddress the token address for the project
    */
    function setTokenAddress(bytes32 namespace, address tokenAddress) external connected {
        (bool existing,) = isExisting(namespace);
        require(existing);

        projectControllerStore.setAddress(
            keccak256(abi.encodePacked(namespace, TOKEN_ADDRESS)), 
            tokenAddress
        );

        emit ProjectTokenSet(msg.sender, namespace, tokenAddress);
    }

    /**
    * Bind with a storage contract
    *
    * @param store the address of a storage contract
    */
    function setStorage(address store) public connected {
        super.setStorage(store);
        projectControllerStore = ProjectControllerStorage(storeAddr);

        emit ProjectControllerStoreSet(msg.sender, CI, projectControllerStore.CI(), store);
    }

    /**
    * Return the namespace belongs to an owner
    *
    * @param owner address for an owner
    */
    function getNamespace(address owner) public view returns (bytes32) {
        return projectControllerStore.getBytes32(keccak256(abi.encodePacked(owner, NAMESPACE)));
    }

    /**
    * Return the token address belongs to a project
    *
    * @param namespace namespace of a project
    */
    function getTokenAddress(bytes32 namespace) public view returns (address) {
        (bool existing,) = isExisting(namespace);
        require(existing);

        return projectControllerStore.getAddress(
            keccak256(abi.encodePacked(namespace, TOKEN_ADDRESS))
        );
    }

    /**
    * Return the information of given project hash
    *
    * @param namespace namespace of a project
    * @return 
    *   bool: the boolean represent if given project exist 
    *   uint: the project state 
    *   uint: the number of ether that can lock(wei_lock)
    */
    function getProjectInfo(bytes32 namespace) public view returns (bool, uint, uint) {
        (bool existing,) = isExisting(namespace);

        uint state = 0;
        if (existing) {
            state = projectControllerStore.getUint(
                keccak256(abi.encodePacked(namespace, PROJECT_STATE)));
        }

        EtherCollector etherCollector = 
            EtherCollector(contractAddressHandler.contracts(ETHER_COLLECTOR_CI));
        uint etherCanLock = etherCollector.getDepositValue(
            keccak256(abi.encodePacked(namespace, PROJECT_ETHER_BALANCE)));
        
        return (existing, state, etherCanLock);
    }

    /**
    * Return the project state for a project
    *
    * @param namespace namespace of a project
    */
    function getProjectState(bytes32 namespace) public view returns (uint) {
        (bool existing,) = isExisting(namespace);
        require(existing);

        return uint(projectControllerStore.getUint(
            keccak256(abi.encodePacked(namespace, PROJECT_STATE))));
    }

    /**
    * Verify whether an onwer address belongs to a project
    *
    * @param namespace namespace of a project
    * @param owner address for an owner
    */
    function verifyOwner(bytes32 namespace, address owner) public view returns (bool) {
        require(owner != ZERO_ADDRESS);

        address expectedOwner = projectControllerStore.getAddress(
            keccak256(abi.encodePacked(namespace, OWNER)));
        return expectedOwner == owner;
    }

    /**
    * Return true and return owner address if a project exists
    *
    * @param namespace namespace of a project
    */
    function isExisting(bytes32 namespace) internal view returns (bool, address) {
        address owner = projectControllerStore.getAddress(
            keccak256(abi.encodePacked(namespace, OWNER)));
        return owner != ZERO_ADDRESS ? (true, owner) : (false, ZERO_ADDRESS);
    }
}
