import EVMRevert from 'openzeppelin-solidity/test/helpers/EVMRevert'
import EVMThrow from 'openzeppelin-solidity/test/helpers/EVMThrow'

const wweb3 = require('web3')
const BigNumber = web3.BigNumber;

const should = require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .should();

const ProjectControllerModule = artifacts.require('projectControllerModule/ProjectControllerModule');
const ACLHandler  = artifacts.require('handler/ACLHandler');
const ContractAddressHandler = artifacts.require('handler/ContractAddressHandler');
const Kernel = artifacts.require('kernel/Kernel');

contract('ProjectControllerModuleTest', function ([root, _, testAccount1, testAccount2]) {

    const aclHandlerCI = wweb3.utils.keccak256("ACLHandler");
    const projectControllerModuleCI = wweb3.utils.keccak256("ProjectControllerModule");

    const testNameSpace1 = wweb3.utils.keccak256("testNameSpace1");
    const testNameSpace2 = wweb3.utils.keccak256("testNameSpace2");

    const contractAddressHandlerCI = wweb3.utils.keccak256("ContractAddressHandler");
    const rootCI = wweb3.utils.keccak256("root");

    const REGISTER_OWNER_SIG = "0xba50fffb";
    const SET_NEXT_STAGE_SIG = "0xabc1719b";

    before(async function () {
    });

    beforeEach(async function () {
        this.kernel = await Kernel.new();
        this.aclHandler = await ACLHandler.new(this.kernel.address);
        this.contractAddressHandler = await ContractAddressHandler.new(this.kernel.address);
        this.projectControllerModule = await ProjectControllerModule.new(this.kernel.address);

        this.kernel.registerHandler(aclHandlerCI, this.aclHandler.address);
        this.kernel.registerHandler(contractAddressHandlerCI, this.contractAddressHandler.address);
        this.kernel.connect(this.aclHandler.address, []);
        this.kernel.connect(this.contractAddressHandler.address, []);
        this.kernel.connect(this.projectControllerModule.address, [aclHandlerCI, contractAddressHandlerCI])
            .should.be.fulfilled;

        // register contract
        this.contractAddressHandler.registerContract(rootCI, root).should.be.fulfilled;
        // give permit for root address call registerOwner and setHandler
        this.aclHandler.permit(rootCI, projectControllerModuleCI, REGISTER_OWNER_SIG).should.be.fulfilled;
        this.aclHandler.permit(rootCI, projectControllerModuleCI, SET_NEXT_STAGE_SIG).should.be.fulfilled;
    });

    describe('basic test', function () {
        it('should connected', async function () {
            var result = await this.projectControllerModule.isConnected.call();
            result.should.be.equal(true);
        });

        it('should register contract success', async function () {
            var result = await this.projectControllerModule.CI.call();
            result.should.be.equal(projectControllerModuleCI);
        });
        it('should register success', async function () {
            // register owner;
            await this.projectControllerModule.registerOwner(testNameSpace1, testAccount1).should.be.fulfilled;
            var result = await this.projectControllerModule.owners.call(testNameSpace1);
            result.should.be.equal(testAccount1);
            result = await this.projectControllerModule.reverseLookUp.call(testAccount1);
            result.should.be.equal(testNameSpace1);
        });

        it('initial state should be zero', async function () {
            var result = await this.projectControllerModule.state.call();
            result.should.be.bignumber.equal(0);
        })

        it('should set state success', async function () {
            await this.projectControllerModule.setNextState(2).should.be.fulfilled;
            var result = await this.projectControllerModule.state.call();
            result.should.be.bignumber.equal(2);
        })

        it('should receive correct handler', async function () {
            var result = await this.projectControllerModule.handlers.call(aclHandlerCI);
            result.should.be.equal(this.aclHandler.address);
            result = await this.projectControllerModule.handlers.call(contractAddressHandlerCI);
            result.should.be.equal(this.contractAddressHandler.address);
        });

        it('should receive correct kernel', async function () {
            var result = await this.projectControllerModule.kernel.call();
            result.should.be.equal(this.kernel.address);
        });

        it('should receive status connected', async function () {
            var result = await this.projectControllerModule.status.call();
            result.should.be.bignumber.equal(1);
        });

        it("should disconnect", async function () {
            await this.kernel.disconnect(this.projectControllerModule.address, [aclHandlerCI, contractAddressHandlerCI])
                .should.be.fulfilled;
            var result = await this.projectControllerModule.isConnected.call();
            result.should.be.equal(false);
        });

    });

    describe('branch test', function () {
        it('should rejected by EVM Throw', async function () {
            this.projectControllerModule.setNextState(100).should.be.rejectedWith(EVMThrow);
        });

        it('should reject cause invalid srcCI (permit)', async function () {
            this.aclHandler.permit("", projectControllerModuleCI, SET_NEXT_STAGE_SIG).should.be.rejectedWith(EVMRevert);
            this.aclHandler.permit(rootCI, "", SET_NEXT_STAGE_SIG).should.be.rejectedWith(EVMRevert);
        });

        it('should rejected cause not from kernel', async function () {
            this.projectControllerModule.connect().should.be.rejectedWith(EVMRevert);
        });

        it('should reject cause invalid srcCI (forbid)', async function () {
            this.aclHandler.forbid("", projectControllerModuleCI, SET_NEXT_STAGE_SIG).should.be.rejectedWith(EVMRevert);
            this.aclHandler.forbid(rootCI, "", SET_NEXT_STAGE_SIG).should.be.rejectedWith(EVMRevert);
        });

        it('should reject cause already connected', async function () {
            this.kernel.connect(this.aclHandler.address, []).should.be.rejectedWith(EVMRevert);
        });

        it('should reject cause already disconnected', async function () {
            await this.kernel.disconnect(this.aclHandler.address, []).should.be.fulfilled;
            await this.kernel.disconnect(this.aclHandler.address, []).should.be.rejectedWith(EVMRevert);
        });

        it('should reject cause double register', async function () {
            await this.projectControllerModule.registerOwner(testNameSpace1, testAccount1).should.be.fulfilled;
            await this.projectControllerModule.registerOwner(testNameSpace1, testAccount1).should.be.rejectedWith(EVMRevert);
        });

        it('should reject cause set next state before current state', async function () {
            await this.projectControllerModule.setNextState(1).should.be.fulfilled;
            await this.projectControllerModule.setNextState(0).should.be.rejectedWith(EVMRevert);
        });
    });

    describe('permission test', function () {
        it('should rejected by EVM Throw', async function () {
            await this.projectControllerModule.setNextState(2).should.be.fulfilled;
            const { logs } = await this.aclHandler.forbid(rootCI, projectControllerModuleCI, SET_NEXT_STAGE_SIG)
                .should.be.fulfilled;
            const event = logs.find(e => e.event === 'LogForbid');
            should.exist(event);
            event.args.src.should.equal(rootCI);
            event.args.dst.should.equal(projectControllerModuleCI);
            var expectSig = (SET_NEXT_STAGE_SIG + "0".repeat(66)).substring(0, 66);
            event.args.sig.should.equal(expectSig);
            await this.projectControllerModule.setNextState(2).should.be.rejectedWith(EVMRevert);
        })

        it('should log permit', async function () {
            const testSig = wweb3.utils.keccak256("TEST_SIG");
            const { logs } = await this.aclHandler.permit(rootCI, projectControllerModuleCI, testSig)
                .should.be.fulfilled;
            const event = logs.find(e => e.event === 'LogPermit');
            should.exist(event);
            event.args.src.should.equal(rootCI);
            event.args.dst.should.equal(projectControllerModuleCI);
            event.args.sig.should.equal(testSig);
        })
    });

    describe('register contract test', function () {
        it('should reject cause already registered', async function () {
            this.contractAddressHandler.registerContract(rootCI, root).should.be.rejectedWith(EVMRevert);
        }) ;

        it('should receive root address', async function () {
            var address = await this.contractAddressHandler.contracts.call(rootCI);
            address.should.be.equal(root);
        }) ;

        it('should reject cause unregistered contract', async function () {
            this.contractAddressHandler.unregisterContract(testNameSpace1).should.be.rejectedWith(EVMRevert);
        }) ;

        it('should unregistered root', async function () {
            var address = await this.contractAddressHandler.contracts.call(rootCI);
            address.should.be.equal(root);
            await this.contractAddressHandler.unregisterContract(rootCI).should.be.fulfilled;
            var address = await this.contractAddressHandler.contracts.call(rootCI);
            address.should.not.be.equal(root);
        }) ;
    });
});
