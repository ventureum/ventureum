import {
  Token,
  Kernel,
  ACLHandler,
  ContractAddressHandler,
  RefundManager,
  ProjectController,
  MilestoneController,
  EtherCollector,
  TokenCollector,
  TokenSale,
  Storage} from "./contants.js";

const run = exports.run = async([root]) => {
  /*---------------------Deploy Contracts---------------------------------*/
  /**
   * deploy token
   */
  const token = await Token.Self.new();


  /**
   * deploy kernel
   */
  const kernel = await Kernel.Self.new();


  /**
   * deploy handlers
   */
  // ACLHandler
  const aclHandler = await ACLHandler.Self.new(kernel.address);

  // ContractAddressHandler
  const contractAddressHandler = await ContractAddressHandler.Self.new(
    kernel.address);


  /**
   * deploy controllers
   */
  // Refund Manager
  const refundManager = await RefundManager.Self.new(kernel.address);
  const refundManagerStorage = await RefundManager.Storage
    .Self.new(kernel.address);


  /**
   * deploy controllers
   */
  // Project Controller
  const projectController = await ProjectController.Self.new(kernel.address);
  const projectControllerStorage = await ProjectController.Storage.Self.new(
    kernel.address);

  // Milestone Controller
  const milestoneController = await MilestoneController.Self.new(
    kernel.address);
  const milestoneControllerStorage = await MilestoneController.Storage.Self.new(
    kernel.address);

  // Ether Collector
  const etherCollector = await EtherCollector.Self.new(kernel.address);
  const etherCollectorStorage = await EtherCollector.Storage
    .Self.new(kernel.address);

  // Token Collector
  const tokenCollector = await TokenCollector.Self.new(kernel.address);

  // Token Sale
  const tokenSale = await TokenSale.Self.new(kernel.address);


  /*---------------------Kernel Register Handlers-----------------------------*/
  // ACLHandler
  await kernel.registerHandler(ACLHandler.CI, aclHandler.address);

  // ContractAddressHandler
  await kernel.registerHandler(ContractAddressHandler.CI,
    contractAddressHandler.address);


  /*---------------------Kernel Connect Handlers & Modules---- ---------------*/
  /**
   * Kernel Connect handlers
   */
  // AclHandler
  await kernel.connect(aclHandler.address, []);

  // ContractAddressHandler
  await kernel.connect(contractAddressHandler.address, []);


  /**
   * Kernel Connect managers
   */
  // Refund Manager
  await kernel.connect(
    refundManager.address,
    [ACLHandler.CI, ContractAddressHandler.CI]);
  await kernel.connect(
    refundManagerStorage.address,
    [ACLHandler.CI, ContractAddressHandler.CI]);

  /**
   * Kernel Connect controllers
   */
  // ProjectController
  await kernel.connect(
    projectController.address,
    [ACLHandler.CI, ContractAddressHandler.CI]);
  await kernel.connect(
    projectControllerStorage.address,
    [ACLHandler.CI, ContractAddressHandler.CI]);

  // MilestoneController
  await kernel.connect(
    milestoneController.address,
    [ACLHandler.CI, ContractAddressHandler.CI]);
  await kernel.connect(
    milestoneControllerStorage.address,
    [ACLHandler.CI, ContractAddressHandler.CI]);

  // EtherCollector
  await kernel.connect(
    etherCollector.address,
    [ACLHandler.CI, ContractAddressHandler.CI]);
  await kernel.connect(
    etherCollectorStorage.address,
    [ACLHandler.CI, ContractAddressHandler.CI]);

  // TokenCollector
  await kernel.connect(
    tokenCollector.address,
    [ACLHandler.CI, ContractAddressHandler.CI]);

  // TokenSale
  await kernel.connect(
    tokenSale.address,
    [ACLHandler.CI, ContractAddressHandler.CI]);


  /*----------------ContractAddressHandler Registers Contracts----------------*/
  /**
   * ContractAddressHandler Register Root
   */
  await contractAddressHandler.registerContract(Kernel.RootCI, root);

  /**
   * ContractAddressHandler Register managers
   */
  // Refund Manager
  await contractAddressHandler.registerContract(
    RefundManager.CI,
    refundManager.address);
  await contractAddressHandler.registerContract(
    RefundManager.Storage.CI,
    refundManagerStorage.address);

  /**
   * ContractAddressHandler Register controllers
   */
  // Project Controller
  await contractAddressHandler.registerContract(
    ProjectController.CI,
    projectController.address);
  await contractAddressHandler.registerContract(
    ProjectController.Storage.CI,
    projectControllerStorage.address);

  // Milestone Controller
  await contractAddressHandler.registerContract(
    MilestoneController.CI,
    milestoneController.address);
  await contractAddressHandler.registerContract(
    MilestoneController.Storage.CI,
    milestoneControllerStorage.address);

  // Ether Collector
  await contractAddressHandler.registerContract(
    EtherCollector.CI,
    etherCollector.address);
  await contractAddressHandler.registerContract(
    EtherCollector.Storage.CI,
    etherCollectorStorage.address);

  // Token Collector
  await contractAddressHandler.registerContract(
    TokenCollector.CI,
    tokenCollector.address);

  // Token Sale
  await contractAddressHandler.registerContract(
    TokenSale.CI,
    tokenSale.address);


  /*------------------------ACLHandler Grants permit -------------------------*/
  /**
   * Grant permits to Root
   */
  // Destination: Refund Manager
  await aclHandler.permit(
    Kernel.RootCI,
    RefundManager.CI,
    [RefundManager.Sig.SetStorage]);

  // Destination: Project Controller
  await aclHandler.permit(
    Kernel.RootCI,
    ProjectController.CI,
    [
      ProjectController.Sig.RegisterProject,
      ProjectController.Sig.UnregisterProject,
      ProjectController.Sig.SetState,
      ProjectController.Sig.SetStorage,
      ProjectController.Sig.SetTokenAddress
    ]);
  await aclHandler.permit(
    Kernel.RootCI,
    ProjectController.Storage.CI,
    [Storage.Sig.SetUint, Storage.Sig.SetAddress, Storage.Sig.SetBytes32]);

  // Destination: Milestone Controller
  await aclHandler.permit(
    Kernel.RootCI,
    MilestoneController.CI,
    [MilestoneController.Sig.SetStorage]);
  await aclHandler.permit(
    Kernel.RootCI,
    MilestoneController.Storage.CI,
    [Storage.Sig.SetUint, Storage.Sig.SetArray]);

  // Destination: Token Collector
  await aclHandler.permit(
    Kernel.RootCI,
    TokenCollector.CI,
    [TokenCollector.Sig.Withdraw, TokenCollector.Sig.Deposit]);

  // Destination: Ether Collector
  await aclHandler.permit(
    Kernel.RootCI,
    EtherCollector.CI,
    [
      EtherCollector.Sig.SetStorage,
      EtherCollector.Sig.Deposit,
      EtherCollector.Sig.Withdraw
    ]);
  await aclHandler.permit(
    Kernel.RootCI,
    EtherCollector.Storage.CI,
    [Storage.Sig.SetUint]);


  /**
   * Grant permits to managers
   */
  // Source: Refund Manager
  // Destination: Refund Manager Storage
  await aclHandler.permit(
    RefundManager.CI,
    RefundManager.Storage.CI,
    [Storage.Sig.SetUint]);
  // Destination: Token Collector
  await aclHandler.permit(
    RefundManager.CI,
    TokenCollector.CI,
    [TokenCollector.Sig.Deposit]);
  // Destination: Token Collector
  await aclHandler.permit(
    RefundManager.CI,
    EtherCollector.CI,
    [EtherCollector.Sig.Withdraw]);


  /**
   * Grant permits to controllers
   */
  // Source: Project Controller
  // Destination: Project Controller Storage
  await aclHandler.permit(
    ProjectController.CI,
    ProjectController.Storage.CI,
    [Storage.Sig.SetUint, Storage.Sig.SetAddress, Storage.Sig.SetBytes32]);

  // Source: Milestone Controller
  // Destination: Milestone Controller Storage
  await aclHandler.permit(
    MilestoneController.CI,
    MilestoneController.Storage.CI,
    [Storage.Sig.SetUint, Storage.Sig.SetArray]);

  // Source: Ether Collector
  // Destination: Ether Collector Storage
  await aclHandler.permit(
    EtherCollector.CI,
    EtherCollector.Storage.CI,
    [Storage.Sig.SetUint]);

  // Source: Token Sale
  // Destination: Token Controller
  await aclHandler.permit(
    TokenSale.CI,
    TokenCollector.CI,
    [TokenCollector.Sig.Withdraw]);


  /*------------------------Set Storage-------------------------*/
  /**
   * Set Storage for managers
   */
  // Refund Manager
  await refundManager.setStorage(refundManagerStorage.address);


  /**
   * Set Storage for controllers
   */
  // Project Controller
  await projectController.setStorage(projectControllerStorage.address);

  // Milestone Controller
  await milestoneController.setStorage(milestoneControllerStorage.address);

  // Ether Collector
  await etherCollector.setStorage(etherCollectorStorage.address);


  /*------------------------Managers Connected to Controllers-----------------*/
  // Refund Manager
  contractAddressHandler.connect(
    refundManager.address,
    [
      ProjectController.CI,
      MilestoneController.CI,
      TokenSale.CI,
      TokenCollector.CI,
      EtherCollector.CI
    ]);


  /*------------------------Return--------------------------------------------*/
  return {
    token,
    kernel,
    aclHandler,
    contractAddressHandler,
    refundManager,
    refundManagerStorage,
    projectController,
    projectControllerStorage,
    milestoneController,
    milestoneControllerStorage,
    etherCollector,
    etherCollectorStorage,
    tokenCollector,
    tokenSale
  };
};
