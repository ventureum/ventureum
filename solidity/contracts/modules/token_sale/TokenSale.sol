pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "vetx-token/contracts/VetXToken.sol";

import "../Module.sol";
import "../token_collector/TokenCollector.sol";
import "../ether_collector/EtherCollector.sol";
import "../project_controller/ProjectController.sol";
import "../milestone_controller/MilestoneController.sol";
import "./TokenSaleStorage.sol";


contract TokenSale is Module {
    using SafeMath for uint;

    // events
    event _StartTokenSale (
        address indexed sender,
        bytes32 indexed namespace,
        uint rate,
        address token
    );

    event _BuyTokens (
        address indexed sender,
        bytes32 indexed namespace,
        uint tokenNum,
        uint ethNum
    );

    event WithdrawToken (
        address indexed founder,
        bytes32 indexed namespace,
        uint tokenNum,
        uint timestamp
    );

    event _Finalized (address indexed sender, bytes32 indexed namespace);

    address constant NULL = address(0x0);

    bytes32 constant RATE = keccak256("rate");
    bytes32 constant TOKEN_ADDRESS  = keccak256("tokenAddress");
    bytes32 constant TOTAL_TOKEN_FOR_SALE = keccak256("totalTokenForSale");
    bytes32 constant TOTAL_TOKEN_SOLD = keccak256("totalTokenSold");
    bytes32 constant TOTAL_ETH_RECEIVED = keccak256("totalEthReceived");
    bytes32 constant FINALIZED = keccak256("finalized");
    bytes32 constant AVERAGE_PRICE = keccak256("averagePrice");

    uint256 constant FALSE = 0;
    uint256 constant TRUE = 1;

    VetXToken public vtx;
    uint256 public vtxBase;

    ProjectController public projectController;
    TokenSaleStorage public tokenSaleStore;

    modifier founderOnly(bytes32 namespace) {
        require(projectController != NULL);
        require(projectController.verifyOwner(namespace, msg.sender));
        _;
    }

    constructor (
        address kernelAddr, 
        uint256 _vtxBase, 
        address _vtx
    ) 
        Module(kernelAddr) 
        public 
    {
        require (_vtxBase > 0);
        require (_vtx != NULL);

        CI = keccak256("TokenSale");

        vtxBase = _vtxBase;
        vtx = VetXToken(_vtx);
    }

    function setProjectController(address _projectController) 
        external
        connected
    {
        require (_projectController != NULL);
        projectController = ProjectController(_projectController);
    }

    function setVtxBase(uint _vtxBase) external connected {
        require(_vtxBase > 0);
        vtxBase = _vtxBase;
    }

    /**
     * Start a token sale after application has been accepted
     *
     * @param namespace namespace of the project
     * @param rate (uint) of token sale
     * @param tokenAddress address of the project token
     * @param totalToken the initial amount of token for token sale
     */
    function startTokenSale(bytes32 namespace, uint rate, address tokenAddress, uint totalToken) 
        external
        founderOnly(namespace)
    {
        require(projectController != NULL);

        // require project exist and already in whitelist
        (bool existing, uint state,) = projectController.getProjectInfo(namespace);
        require(existing);
        require(state == uint(ProjectController.ProjectState.AppAccepted));

        // require project not token sale before
        require(!tokenInfoExist(namespace));

        // Initial token info
        tokenSaleStore.setUint(
            keccak256(abi.encodePacked(namespace, RATE)),
            rate
        );
        tokenSaleStore.setAddress(
            keccak256(abi.encodePacked(namespace, TOKEN_ADDRESS)),
            tokenAddress
        ) ;
        tokenSaleStore.setUint(
            keccak256(abi.encodePacked(namespace, TOTAL_TOKEN_FOR_SALE)),
            totalToken
        );
        tokenSaleStore.setUint(
            keccak256(abi.encodePacked(namespace, TOTAL_TOKEN_SOLD)),
            0
        );
        tokenSaleStore.setUint(
            keccak256(abi.encodePacked(namespace, TOTAL_ETH_RECEIVED)),
            0
        );
        tokenSaleStore.setUint(
            keccak256(abi.encodePacked(namespace, FINALIZED)),
            FALSE
        );

        /*
        * Founder transfer token to TokenCollector
        */
        (TokenCollector tokenCollector,) = getCollectors();
        // transfer token to this(self) first
        require(ERC20(tokenAddress).transferFrom(msg.sender, this, totalToken));
        // approve that tokenCollector can transfer token from this(self)
        require(ERC20(tokenAddress).approve(tokenCollector, totalToken));
        // deposit token to TokenCollector
        tokenCollector.deposit(
            keccak256(abi.encodePacked(namespace, PROJECT_TOKEN_BALANCE)), 
            tokenAddress, 
            totalToken);

        // All set, change the state to TokenSale
        projectController.setState(namespace, uint(ProjectController.ProjectState.TokenSale));

        // Set project controller token address
        projectController.setTokenAddress(namespace, tokenAddress);

        emit _StartTokenSale(msg.sender, namespace, rate, tokenAddress);
    }

    /**
     * Finalize a token sale, investors can not call buyTokens
     * after a sale has been finalized
     *
     * Calculate the token sale average price, and write it to storage
     *
     * @param namespace namespace of the project
     */
    function finalize(bytes32 namespace) external founderOnly(namespace) {
        uint256 finalized = tokenSaleStore.getUint(
            keccak256(abi.encodePacked(namespace, FINALIZED)));

        // require token sale exist and not finalize yet
        require(tokenInfoExist(namespace) && finalized == FALSE);

        (TokenCollector tokenCollector, EtherCollector etherCollector) = getCollectors();

        // get token balance and ether balance and store it
        uint256 totalTokenForSale= tokenSaleStore.getUint(
            keccak256(abi.encodePacked(namespace, TOTAL_TOKEN_FOR_SALE)));
        uint256 projectTokenBalance= tokenCollector.getDepositValue(
            keccak256(abi.encodePacked(namespace, PROJECT_TOKEN_BALANCE)));
        uint256 totalEthReceived = etherCollector.getDepositValue(
            keccak256(abi.encodePacked(namespace, PROJECT_ETHER_BALANCE)));
        uint256 totalTokenSold = totalTokenForSale - projectTokenBalance;
        tokenSaleStore.setUint(
            keccak256(abi.encodePacked(namespace, TOTAL_ETH_RECEIVED)),
            totalEthReceived);
        tokenSaleStore.setUint(
            keccak256(abi.encodePacked(namespace, TOTAL_TOKEN_SOLD)),
            totalTokenSold);

        // calculate average price and store it.
        uint avg = 0;
        if (totalEthReceived != 0) {
            avg = totalTokenSold.div(totalEthReceived);
        }
        tokenSaleStore.setUint(
            keccak256(abi.encodePacked(namespace, AVERAGE_PRICE)),
            avg);

        // set finalized to be true
        tokenSaleStore.setUint(
            keccak256(abi.encodePacked(namespace, FINALIZED)),
            TRUE
        );

        // lock the project total max regulator rewards
        MilestoneController milestoneController = 
            MilestoneController(contractAddressHandler.contracts(MILESTONE_CONTROLLER_CI));
        bytes32 fromKey = keccak256(abi.encodePacked(namespace, PROJECT_ETHER_BALANCE));
        bytes32 toKey = keccak256(abi.encodePacked(namespace, PROJECT_TOTAL_REGULATOR_REWARDS));
        uint totalMaxRewards = milestoneController.getProjectTotalRegulatorRewards(namespace);
        etherCollector.insideTransfer(fromKey, toKey, totalMaxRewards);

        emit _Finalized(msg.sender, namespace);
    }

    /**
     * Return token info if this token sale info exist.
     *
     * @param namespace namespace of the project
     * @return
     *      uint the rate of this token sale
     *      uint the number of token already sold
     *      uint the number of ether received in this token sale (current)
     *      bool `True` means this token sale is finalized, `False` otherwise.
     *      uint the number of rest token that can purchase 
     *           if not finalized: restToken + tokenAlreadySold == TotalTokenForSale
     */
    function tokenInfo(bytes32 namespace) external view returns (uint, uint, uint, bool, uint) {
        require(tokenInfoExist(namespace));
        bool finalized = 
            tokenSaleStore.getUint(keccak256(abi.encodePacked(namespace, FINALIZED))) == TRUE;

        uint totalTokenSold = tokenSaleStore.getUint(
            keccak256(abi.encodePacked(namespace, TOTAL_TOKEN_SOLD)));
        uint totalEthReceived = tokenSaleStore.getUint(
            keccak256(abi.encodePacked(namespace, TOTAL_ETH_RECEIVED)));

        (TokenCollector tokenCollector, EtherCollector etherCollector)  = getCollectors();

        // get number token left, if finalized, can be withdrawn, else can be purchased. 
        uint numTokenLeft = tokenCollector.getDepositValue(
            keccak256(abi.encodePacked(namespace, PROJECT_TOKEN_BALANCE)));

        // get the total token for sale
        uint totalTokenForSale = tokenSaleStore.getUint(
            keccak256(abi.encodePacked(namespace, TOTAL_TOKEN_FOR_SALE)));

        // if the token sale is not finalized, totalTokenSold, and totalEthReceived will be 0
        // get the current sale information from TokenCollector and etherColector.
        if (!finalized) {
            totalTokenSold = totalTokenForSale - numTokenLeft;
            totalEthReceived = etherCollector.getDepositValue(
                keccak256(abi.encodePacked(namespace, PROJECT_ETHER_BALANCE)));
        }

        return (
            tokenSaleStore.getUint(keccak256(abi.encodePacked(namespace, RATE))),
            totalTokenSold,
            totalEthReceived,
            finalized,
            numTokenLeft);
    }

    /**
    * Bind with a storage contract
    *
    * @param store the address of a storage contract
    */
    function setStorage(address store)  public connected {
        super.setStorage(store);
        tokenSaleStore = TokenSaleStorage(storeAddr);

        //emit TokenSaleStoreSet(msg.sender, CI, tokenSaleStore.CI(), store);
    }

    /**
     * Return the average price of a token sale
     *
     * @param namespace namespace of the project
     * @return 0 if token sale has not been finalzied or does not
     * exist, otherwise returns the average price
     */
    function avgPrice(bytes32 namespace) public view returns (uint) {
        uint256 finalized = tokenSaleStore.getUint(
            keccak256(abi.encodePacked(namespace, FINALIZED)));

        // require token exist and finalized
        require(tokenInfoExist(namespace) && finalized == TRUE);


        uint256 avg = tokenSaleStore.getUint(
            keccak256(abi.encodePacked(namespace, AVERAGE_PRICE)));

        return avg;
    }

    /** 
     * Return true if this token sale info exist.
     *
     * @param namespace namespace of the project
     * @return true if this project already have token sale.
     */
    function tokenInfoExist(bytes32 namespace) public view returns (bool) {
        address tokenAddress = tokenSaleStore.getAddress(
            keccak256(abi.encodePacked(namespace, TOKEN_ADDRESS)));
        return tokenAddress != NULL;
    }

    /**
     * Purchase tokens
     *
     * Withdraw msg.value * rate tokens from TokenCollector, then
     * transfer tokens to msg.sender
     *
     * @param namespace namespace of the project
     */
    function buyTokens(bytes32 namespace) public payable {
        // require this tokenSale exist and not finalize
        bool finalized = 
            tokenSaleStore.getUint(keccak256(abi.encodePacked(namespace, FINALIZED))) == TRUE;
        require(tokenInfoExist(namespace) && !finalized);

        // calculate the token number that msg.sender will receive.
        uint rate = tokenSaleStore.getUint(keccak256(abi.encodePacked(namespace, RATE)));
        uint tokenNum = msg.value.mul(rate);

        (TokenCollector tokenCollector, EtherCollector etherCollector) = getCollectors();

        // calculate the vtx spend and transfer
        uint vtxSpend = tokenNum.div(vtxBase);
        require(vtx.transferFrom(msg.sender, tokenCollector, vtxSpend));

        // withdraw token from TokenCollector
        address tokenAddress = tokenSaleStore.getAddress(
            keccak256(abi.encodePacked(namespace, TOKEN_ADDRESS)));
        tokenCollector.withdraw(
            keccak256(abi.encodePacked(namespace, PROJECT_TOKEN_BALANCE)),
            tokenAddress,
            msg.sender, 
            tokenNum);

        // deposit ether to EtherCollector
        etherCollector.deposit.value(msg.value)(
            keccak256(abi.encodePacked(namespace, PROJECT_ETHER_BALANCE)));


        emit _BuyTokens(msg.sender, namespace, tokenNum, msg.value);
    }

    /**
    * get the TokenCollector and EtherCollector
    *
    * @return tokenCollector. etherCollector
    */
    function getCollectors() internal view returns(TokenCollector, EtherCollector) {
        TokenCollector tokenCollector =
            TokenCollector(contractAddressHandler.contracts(TOKEN_COLLECTOR_CI));

        EtherCollector etherCollector  =
            EtherCollector(contractAddressHandler.contracts(ETHER_COLLECTOR_CI));
        return (tokenCollector, etherCollector);
    }
}
