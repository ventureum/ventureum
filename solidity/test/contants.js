import { increaseTimeTo, duration } from
    "openzeppelin-solidity/test/helpers/increaseTime";
import latestTime from "openzeppelin-solidity/test/helpers/latestTime";
import EVMRevert from "openzeppelin-solidity/test/helpers/EVMRevert"

const fs = require("fs")
const Web3 = require("web3")
const wweb3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
const BigNumber = web3.BigNumber;
const should = require("chai")
.use(require("chai-as-promised"))
.use(require("chai-bignumber")(BigNumber))
.should();

const SET_STORAGE_SIG = wweb3.eth.abi.encodeFunctionSignature(
  "setStorage(address)");

/*---------------------Utils--------------------------------------------------*/
class TimeSetter {}
TimeSetter.increaseTimeTo = increaseTimeTo;
TimeSetter.duration = duration;
TimeSetter.latestTime = latestTime;
TimeSetter.OneMonth = duration.days(1) * 30;
TimeSetter.OneWeek = duration.weeks(1);
TimeSetter.OneYear = duration.years(1);

class Error {}
Error.EVMRevert = EVMRevert;

/*---------------------Contracts----------------------------------------------*/
/**
 * Contracts - kernel
 */
class Kernel {}
Kernel.Self = artifacts.require("kernel/Kernel");
Kernel.RootCI = Web3.utils.keccak256("root");


/**
 * Contracts - handlers
 */
// ACLHandler
class ACLHandler {}
ACLHandler.Self = artifacts.require("handlers/ACLHandler");
ACLHandler.CI = Web3.utils.keccak256("ACLHandler");

// ContractAddressHandler
class ContractAddressHandler {}
ContractAddressHandler.Self = artifacts.require(
  "handlers/ContractAddressHandler");
ContractAddressHandler.CI = Web3.utils.keccak256("ContractAddressHandler");


/**
 * Contracts - managers
 */
// RefundManager
class RefundManager {}
RefundManager.Self = artifacts.require(
  "modules/managers/refund_manager/RefundManager");
RefundManager.CI = Web3.utils.keccak256("RefundManager");
RefundManager.Sig = {
  SetStorage: SET_STORAGE_SIG};
RefundManager.Storage = {
  Self: artifacts.require(
    "modules/managers/refund_manager/RefundManagerStorage"),
  CI: Web3.utils.keccak256("RefundManagerStorage")}


/**
 * Contracts - controllers
 */
// Project Controller
class ProjectController {}
ProjectController.Self = artifacts.require(
  "modules/project_controller/ProjectController");
ProjectController.CI = Web3.utils.keccak256("ProjectController");
ProjectController.Sig = {
  RegisterProject: wweb3.eth.abi.encodeFunctionSignature(
    "registerProject(bytes32,address,address)"),
  UnregisterProject: wweb3.eth.abi.encodeFunctionSignature(
    "unregisterProject(bytes32)"),
  SetState: wweb3.eth.abi.encodeFunctionSignature(
    "setState(bytes32,uint256)"),
  SetStorage: SET_STORAGE_SIG,
  SetTokenAddress: wweb3.eth.abi.encodeFunctionSignature(
    "setTokenAddress(bytes32,address)")
};
ProjectController.Storage = {
  Self: artifacts.require(
    "modules/project_controller/ProjectControllerStorage"),
  CI: Web3.utils.keccak256("ProjectControllerStorage")}

// Milestone Controller
class MilestoneController {}
MilestoneController.Self = artifacts.require(
  "modules/milestone_controller/MilestoneController");
MilestoneController.CI = Web3.utils.keccak256("MilestoneController");
MilestoneController.Sig = {
  RegisterProject: wweb3.eth.abi.encodeFunctionSignature(
    "registerProject(bytes32,address,address)"),
  SetStorage: SET_STORAGE_SIG};
MilestoneController.Storage = {
  Self: artifacts.require(
    "modules/milestone_controller/MilestoneControllerStorage"),
  CI: Web3.utils.keccak256("MilestoneControllerStorage")}

// Token Sale
class TokenSale {}
TokenSale.Self = artifacts.require("modules/token_sale/TokenSale");
TokenSale.CI = Web3.utils.keccak256("TokenSale");

// Token Collector
class TokenCollector {}
TokenCollector.Self = artifacts.require(
  "modules/token_collector/TokenCollector");
TokenCollector.CI = Web3.utils.keccak256("TokenCollector");
TokenCollector.Sig = {
  Deposit: wweb3.eth.abi.encodeFunctionSignature(
    "deposit(address,uint256)"),
  Withdraw: wweb3.eth.abi.encodeFunctionSignature(
    "withdraw(address,address,uint256)")};

// Ether Collector
class EtherCollector {}
EtherCollector.Self = artifacts.require(
  "modules/ether_collector/EtherCollector");
EtherCollector.CI = Web3.utils.keccak256("EtherCollector");
EtherCollector.Sig = {
  Deposit: wweb3.eth.abi.encodeFunctionSignature("deposit()"),
  Withdraw: wweb3.eth.abi.encodeFunctionSignature("withdraw(address,uint256)"),
  SetStorage: SET_STORAGE_SIG};
EtherCollector.Storage = {
  Self: artifacts.require("modules/ether_collector/EtherCollectorStorage"),
  CI: Web3.utils.keccak256("EtherCollectorStorage")}

/**
 * Contracts - storage
 */
class Storage {}
Storage.Sig = {
  SetUint: wweb3.eth.abi.encodeFunctionSignature("setUint(bytes32,uint256)"),
  GetUnit: wweb3.eth.abi.encodeFunctionSignature("getUint(bytes32)"),
  SetAddress: wweb3.eth.abi.encodeFunctionSignature(
    "setAddress(bytes32,address)"),
  GetAddress: wweb3.eth.abi.encodeFunctionSignature("getAddress(bytes32)"),
  SetBytes32: wweb3.eth.abi.encodeFunctionSignature(
    "setBytes32(bytes32,bytes32)"),
  GetBytes32: wweb3.eth.abi.encodeFunctionSignature("getBytes32(bytes32)"),
  SetArray: wweb3.eth.abi.encodeFunctionSignature(
    "setArray(bytes32,bytes32[])"),
  GetArray: wweb3.eth.abi.encodeFunctionSignature("getArray(bytes32)")}

/**
 * Contracts - modules
 */
class Registry {}
Registry.Self = artifacts.require("./VTCR/Registry.sol");
Registry.CI = Web3.utils.keccak256("Registry");

/**
 * Contracts - mocks
 */
// Token
class Token {}
Token.Self = artifacts.require("mocks/Token");

// Mocked Project Controllers
class MockedProjectController {}
MockedProjectController.Self = artifacts.require(
  "mocks/MockedProjectController");
MockedProjectController.CI = Web3.utils.keccak256("MockedProjectController");
MockedProjectController.Sig = {
  RegisterOwner: wweb3.eth.abi.encodeFunctionSignature(
    "registerOwner(bytes32,address)"),
  SetState: wweb3.eth.abi.encodeFunctionSignature(
    "setState(bytes32,uint256)")};

class MockedProjectController2 {}
MockedProjectController2.Self = artifacts.require(
  "mocks/MockedProjectController2");
MockedProjectController2.CI = Web3.utils.keccak256("MockedProjectController2");
MockedProjectController2.Sig = {
  RegisterOwner: wweb3.eth.abi.encodeFunctionSignature(
    "registerOwner(bytes32,address)"),
  SetState: wweb3.eth.abi.encodeFunctionSignature(
    "setState(bytes32,uint256)")};

// Mocked Sale for registry
class MockedSale {}
MockedSale.Self = artifacts.require("./mocks/MockedSale.sol");


export {
  Kernel,
  ACLHandler,
  ContractAddressHandler,
  RefundManager,
  ProjectController,
  MockedProjectController,
  MockedProjectController2,
  MilestoneController,
  EtherCollector,
  TokenCollector,
  TokenSale,
  Storage,
  Token,
  Registry,
  MockedSale,
  wweb3,
  Web3,
  should,
  TimeSetter,
  Error,
  fs,
};