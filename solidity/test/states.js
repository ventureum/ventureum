var ProjectMeta = artifacts.require("ProjectMeta");
var Milestones = artifacts.require("Milestones");
var MockBallot = artifacts.require("MockBallot");
var moment = require("moment");

contract('Milestone States', function(accounts) {
    // states
    var INACTIVE = 0;
    var IP = 1;
    var VP1 = 2;
    var VP2 = 3;
    var VP1_AFTER_VP2 = 4;
    var C = 5;
    var RP = 6;
    var TERMINAL = 7;
    var UNDETERMINED = 8;

    var projectMeta;
    var milestones;
    var mockBallot;

    beforeEach(async () => {
        projectMeta = await ProjectMeta.new();
        milestones = await Milestones.new();
        mockBallot = await MockBallot.new();
        await milestones.setProjectMeta(projectMeta.address);
        await projectMeta.setBallot(mockBallot.address);
    });

    it("getDeadline() root node", async function() {
        var timeStamp = moment(0).add(1, 'weeks').unix();
        var deadline = await milestones.getDeadline.call(0);
        assert.equal(deadline.valueOf(), timeStamp.toString(), "Deadline is incorrect");
    });

    it("getDeadlineTx() root node", async function() {
        var timeStamp = moment(0).add(1, 'weeks').unix();
        var deadline = await milestones.getDeadlineTx.call(0);
        assert.equal(deadline.valueOf(), timeStamp.toString(), "Deadline is incorrect");
    });


    it("getDeadline() depth 1", async function() {
        await milestones.addMilestone("TEST", 10, "0x5", 0);
        var timeStamp = moment(0).add(1, 'weeks').add(10, 'days').unix();
        var deadline = await milestones.getDeadline.call(1);
        assert.equal(deadline.valueOf(), timeStamp.toString(), "Deadline is incorrect");
    });

    it("getDeadline() depth 2", async function() {
        await milestones.addMilestone("TEST 1", 10, "0x5", 0);
        await milestones.addMilestone("TEST 2", 21, "0x8", 1);
        var timeStamp1 = moment(0).add(1, 'weeks').add(10, 'days').unix();
        var timeStamp2 = moment(0).add(1, 'weeks').add(31, 'days').unix();
        var deadline1 = await milestones.getDeadline.call(1);
        var deadline2 = await milestones.getDeadline.call(2);
        assert.equal(deadline1.valueOf(), timeStamp1.toString(), "Deadline of node at depth 1 is incorrect");
        assert.equal(deadline2.valueOf(), timeStamp2.toString(), "Deadline of node at depth 2 is incorrect");
    });

    it("getDeadline() depth 1, 3 nodes", async function() {
        await milestones.addMilestone("TEST 1", 10, "0x5", 0);
        await milestones.addMilestone("TEST 2", 21, "0x8", 0);
        var timeStamp1 = moment(0).add(1, 'weeks').add(10, 'days').unix();
        var timeStamp2 = moment(0).add(1, 'weeks').add(21, 'days').unix();
        var deadline1 = await milestones.getDeadline.call(1);
        var deadline2 = await milestones.getDeadline.call(2);
        assert.equal(deadline1.valueOf(), timeStamp1.toString(), "Deadline of node\"TEST 1\" is incorrect");
        assert.equal(deadline2.valueOf(), timeStamp2.toString(), "Deadline of node \"TEST 2\" is incorrect");
    });

    it("state() root node, before deadline", async function() {
        var state = await milestones.state.call(0);
        assert.equal(state.toNumber(), C, "Root node state should be INACTIVE");
    });

    it("state() root node, on deadline", async function() {
        var timeStamp = moment(0).add(1, 'weeks').unix();
        await milestones.setNow(timeStamp);
        var state = await milestones.state.call(0);
        assert.equal(state.toNumber(), TERMINAL, "Root node state should be TERMINAL");
    });

    it("state() root node, after deadline", async function() {
        var timeStamp = moment(0).add(1, 'weeks').add(1, 'days').unix();
        await milestones.setNow(timeStamp);
        var state = await milestones.state.call(0);
        assert.equal(state.toNumber(), TERMINAL, "Root node state should be TERMINAL");
    });

    /**
     * Set now = 0, which is ahead of root node 's deadline (0 + 1 week)
     * which implies the node at depth 1 is in INACTIVE
     */
    it("state() depth 1 node, before the root node's deadline", async function() {
        await milestones.addMilestone("TEST", 10, "0x5", 0);
        var state = await milestones.state.call(1);
        assert.equal(state.toNumber(), INACTIVE, "State should be COMPLETE");
    });

    /**
     * Set now = root node's deadline, which implies the node at depth 1 is in IP
     */
    it("state() depth 1 node, on the root node's deadline", async function() {
        var timeStamp = moment(0).add(1, 'weeks').unix();
        await milestones.setNow(timeStamp);
        await milestones.addMilestone("TEST", 10, "0x5", 0);
        var state = await milestones.state.call(1);
        assert.equal(state.toNumber(), IP, "State should be IP");
    });

    /**
     * Set now = root node's deadline + 1 day, which implies the node at depth 1 is in IP
     */
    it("state() depth 1 node, after the root node's deadline", async function() {
        var timeStamp = moment(0).add(1, 'weeks').add(1, 'days').unix();
        await milestones.setNow(timeStamp);
        await milestones.addMilestone("TEST", 10, "0x5", 0);
        var state = await milestones.state.call(1);
        assert.equal(state.toNumber(), IP, "State should be IP");
    });

});
