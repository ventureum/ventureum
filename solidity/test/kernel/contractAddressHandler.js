import EVMRevert from 'openzeppelin-solidity/test/helpers/EVMRevert'

var Web3 = require('web3');
var wweb3 = new Web3();

const should = require('chai')
    .use(require('chai-as-promised'))
    .should();

const ContractAddressHandler = artifacts.require(
    'handler/ContractAddressHandler');
const Kernel = artifacts.require('kernel/Kernel');

// CIs
const ROOT_CI = wweb3.utils.keccak256("root");
const UNREGISTERED_CI = wweb3.utils.keccak256(
  "UnregisteredCI");

contract('ContractAddressHandlerTest', function (
    [root]) {

    before(async function () {
        this.kernel = await Kernel.new();
        this.contractAddressHandler = await ContractAddressHandler.new(
            this.kernel.address);
        // register contract
        this.contractAddressHandler.registerContract(
            ROOT_CI, root).should.be.fulfilled;
    });

    it('should reject cause already registered', async function () {
        this.contractAddressHandler.registerContract(ROOT_CI, root)
            .should.be.rejectedWith(EVMRevert);
    });

    it('should receive root address', async function () {
        let address = await this.contractAddressHandler.contracts.call(ROOT_CI);
        address.should.be.equal(root);
    });

    it('should reject cause unregistered contract', async function () {
        this.contractAddressHandler.unregisterContract(UNREGISTERED_CI)
            .should.be.rejectedWith(EVMRevert);
    });

    it('should unregistered root', async function () {
        let address = await this.contractAddressHandler.contracts.call(ROOT_CI);
        address.should.be.equal(root);

        await this.contractAddressHandler.unregisterContract(ROOT_CI)
          .should.be.fulfilled;
        address = await this.contractAddressHandler.contracts.call(ROOT_CI);
        address.should.not.be.equal(root);
    });
});
