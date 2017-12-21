var ProjectMeta = artifacts.require("ProjectMeta");
var Milestones = artifacts.require("Milestones");
var moment = require("moment");

contract('Milestones', function(accounts) {
    var projectMeta;
    var milestones;
    beforeEach(async () => {
        projectMeta = await ProjectMeta.new();
        milestones = await Milestones.new();
    });

    it("ProjectMeta Setter and Getter", async () => {
        await milestones.setProjectMeta(projectMeta.address);
        var projectMetaAddr = await milestones.projectMeta.call();

        assert.equal(projectMetaAddr, projectMeta.address, "Retrieved ProjectMeta address is incorrect");
    });

    it("Root node init state", async () => {
        var mLength = await milestones.getMilestoneCount.call();

        assert.equal(mLength, 1, "There should be exactly one milestone node in the array");

        var timeStamp = moment(0).add(1, 'weeks').unix();

        var rv = await milestones.m.call(0);

        assert.equal(rv[0], "ROOT", "Name is incorrect");
        assert.equal(rv[1].valueOf(), "0", "TTC is incorrect");
        assert.equal(rv[2], "0x0000000000000000000000000000000000000000000000000000000000000000", "Hash obj is incorrect");
        assert.equal(rv[3].valueOf(), "0", "Parent id should be 0");
        assert.equal(rv[4], false, "VP2Initiated should be false");
        assert.equal(rv[5].valueOf(), timeStamp.toString(), "Deadline is incorrect");
    });

    it("Add 1 milestone", async () => {
        var mLength = (await milestones.getMilestoneCount.call()).toNumber();
        assert.equal(mLength, 1, "m length should be one");

        await milestones.addMilestone("TEST", 10, "0x5", 0);

        mLength = (await milestones.getMilestoneCount.call()).toNumber();
        assert.equal(mLength, 2, "m length should be two"); 

        var rv = await milestones.m.call(1);

        var timeStamp = moment(0).add(1, 'weeks').add(10, 'days').unix();

        assert.equal(rv[0], "TEST", "Name is incorrect");
        assert.equal(rv[1].valueOf(), "10", "TTC is incorrect");
        assert.equal(rv[2], "0x5000000000000000000000000000000000000000000000000000000000000000", "Hash obj is incorrect");
        assert.equal(rv[3].valueOf(), "0", "Parent id should be 0");
        assert.equal(rv[4], false, "VP2Initiated should be false");
        assert.equal(rv[5].valueOf(), timeStamp.toString(), "Deadline is incorrect");
    });

    it("Add 2 milestones", async () => {
        var mLength = (await milestones.getMilestoneCount.call()).toNumber();
        assert.equal(mLength, 1, "m length should be one");

        await milestones.addMilestone("TEST_1", 10, "0x5", 0);

        mLength = (await milestones.getMilestoneCount.call()).toNumber();
        assert.equal(mLength, 2, "m length should be two");

        var rv = await milestones.m.call(1);

        var timeStamp = moment(0).add(1, 'weeks').add(10, 'days').unix();

        assert.equal(rv[0], "TEST_1", "Name is incorrect");
        assert.equal(rv[1].valueOf(), "10", "TTC is incorrect");
        assert.equal(rv[2], "0x5000000000000000000000000000000000000000000000000000000000000000", "Hash obj is incorrect");
        assert.equal(rv[3].valueOf(), "0", "Parent id should be 0");
        assert.equal(rv[4], false, "VP2Initiated should be false");
        assert.equal(rv[5].valueOf(), timeStamp.toString(), "Deadline is incorrect");

        await milestones.addMilestone("TEST_2", 15, "0x6", 1);

        mLength = (await milestones.getMilestoneCount.call()).toNumber();
        assert.equal(mLength, 3, "m length should be three");

        rv = await milestones.m.call(2);

        timeStamp = moment(0).add(1, 'weeks').add(10, 'days').add(15, 'days').unix();

        assert.equal(rv[0], "TEST_2", "Name is incorrect");
        assert.equal(rv[1].valueOf(), "15", "TTC is incorrect");
        assert.equal(rv[2], "0x6000000000000000000000000000000000000000000000000000000000000000", "Hash obj is incorrect");
        assert.equal(rv[3].valueOf(), "1", "Parent id should be 1");
        assert.equal(rv[4], false, "VP2Initiated should be false");
        assert.equal(rv[5].valueOf(), timeStamp.toString(), "Deadline is incorrect");
    });

    it("getParent() depth 1", async function() {
        // add a milestone
        await milestones.addMilestone("TEST", 10, "0x5", 0);

        var parent = (await milestones.getParent(1)).toNumber();
        assert.equal(parent, 0 , "parent id should be zero");
    });

    it("getParent() depth 2", async function() {
        // add milestones
        await milestones.addMilestone("TEST_1", 10, "0x5", 0);
        await milestones.addMilestone("TEST_2", 15, "0x6", 1);

        var parent = (await milestones.getParent(1)).toNumber();
        assert.equal(parent, 0 , "parent id should be zero");

        var parent = (await milestones.getParent(2)).toNumber();
        assert.equal(parent, 1 , "parent id should be zero");
    });
});

