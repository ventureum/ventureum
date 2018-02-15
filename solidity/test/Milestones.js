
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
        assert.equal(rv[1], "0x0000000000000000000000000000000000000000000000000000000000000000", "Hash obj is incorrect");
        assert.equal(rv[2].valueOf(), "0", "Parent id should be 0");
        assert.equal(rv[3].valueOf(), timeStamp.toString(), "Deadline is incorrect");
        assert.equal(rv[4].valueOf(), "0", "weiLocked should be 0");
        assert.equal(rv[5], false, "mergedToNext should be false");
        
    });

    it("Add 1 milestone", async () => {
        var mLength = (await milestones.getMilestoneCount.call()).toNumber();
        assert.equal(mLength, 1, "m length should be one");

        // root node deadline = 0 + 1 week
        // current node deadline must > root node deadline + 1 week
        // set it to 2 weeks + 1 day
        var timeStamp = moment(0).add(2, 'weeks').add(1, 'days').unix();
        await milestones.addMilestone("TEST", timeStamp.toString(), "0x5", 0);
        
        mLength = (await milestones.getMilestoneCount.call()).toNumber();
        assert.equal(mLength, 2, "m length should be two"); 

        var rv = await milestones.m.call(1);
       
        assert.equal(rv[0], "TEST", "Name is incorrect");
        assert.equal(rv[1], "0x5000000000000000000000000000000000000000000000000000000000000000", "Hash obj is incorrect");
        assert.equal(rv[2].valueOf(), "0", "Parent id should be 0");
        assert.equal(rv[3].valueOf(), timeStamp.toString(), "Deadline is incorrect");
        assert.equal(rv[4].valueOf(), "0", "weiLocked should be 0");
        assert.equal(rv[5], false, "mergedToNext should be false");
    });

    it("Add 2 milestones", async () => {
        var mLength = (await milestones.getMilestoneCount.call()).toNumber();
        assert.equal(mLength, 1, "m length should be one");

        // root node deadline = 0 + 1 week
        // current node deadline must > root node deadline + 1 week
        // set it to 2 weeks + 1 day
        var timeStamp = moment(0).add(2, 'weeks').add(1, 'days').unix();
        await milestones.addMilestone("TEST_1", timeStamp.toString(), "0x5", 0);

        mLength = (await milestones.getMilestoneCount.call()).toNumber();
        assert.equal(mLength, 2, "m length should be two");

        var rv = await milestones.m.call(1);

        assert.equal(rv[0], "TEST_1", "Name is incorrect");
        assert.equal(rv[1], "0x5000000000000000000000000000000000000000000000000000000000000000", "Hash obj is incorrect");
        assert.equal(rv[2].valueOf(), "0", "Parent id should be 0");
        assert.equal(rv[3].valueOf(), timeStamp.toString(), "Deadline is incorrect");
        assert.equal(rv[4].valueOf(), "0", "weiLocked should be 0");
        assert.equal(rv[5], false, "mergedToNext should be false");

        // at least 1 week apart from the previous deadline
        timeStamp = moment(0).add(3, 'weeks').add(2, 'days').unix();
        await milestones.addMilestone("TEST_2", timeStamp.toString(), "0x6", 1);

        mLength = (await milestones.getMilestoneCount.call()).toNumber();
        assert.equal(mLength, 3, "m length should be three");

        rv = await milestones.m.call(2);

        assert.equal(rv[0], "TEST_2", "Name is incorrect");
        assert.equal(rv[1], "0x6000000000000000000000000000000000000000000000000000000000000000", "Hash obj is incorrect");
        assert.equal(rv[2].valueOf(), "1", "Parent id should be 1");
        assert.equal(rv[3].valueOf(), timeStamp.toString(), "Deadline is incorrect");
        assert.equal(rv[4].valueOf(), "0", "weiLocked should be 0");
        assert.equal(rv[5], false, "mergedToNext should be false");
        
    });

    it("getParent() depth 1", async function() {
        // root node deadline = 0 + 1 week
        // current node deadline must > root node deadline + 1 week
        // set it to 2 weeks + 1 day
        var timeStamp = moment(0).add(2, 'weeks').add(1, 'days').unix();

        // add a milestone
        await milestones.addMilestone("TEST", timeStamp.toString(), "0x5", 0);

        var parent = (await milestones.getParent(1)).toNumber();
        assert.equal(parent, 0 , "parent id should be zero");
    });

    it("getParent() depth 2", async function() {
        // root node deadline = 0 + 1 week
        // current node deadline must > root node deadline + 1 week
        // set it to 2 weeks + 1 day
        var timeStamp = moment(0).add(2, 'weeks').add(1, 'days').unix();

        // add milestones
        await milestones.addMilestone("TEST_1", timeStamp.toString(), "0x5", 0);

        // at least 1 week apart from the previous deadline
        timeStamp = moment(0).add(3, 'weeks').add(2, 'days').unix();

        await milestones.addMilestone("TEST_2", timeStamp.toString(), "0x6", 1);

        var parent = (await milestones.getParent(1)).toNumber();
        assert.equal(parent, 0 , "parent id should be zero");

        parent = (await milestones.getParent(2)).toNumber();
        assert.equal(parent, 1 , "parent id should be zero");
    });

    it("verifyObjectives() true", async function() {
        // root node deadline = 0 + 1 week
        // current node deadline must > root node deadline + 1 week
        // set it to 2 weeks + 1 day
        var timeStamp = moment(0).add(2, 'weeks').add(1, 'days').unix();

        // add milestones
        await milestones.addMilestone("TEST_1", timeStamp.toString(), "0x5", 0);

        var rv = await milestones.verifyObjectives.call(1, "0x5");
        assert.equal(rv, true, "return value should be true");
    });

    it("verifyObjectives() false", async function() {
        // root node deadline = 0 + 1 week
        // current node deadline must > root node deadline + 1 week
        // set it to 2 weeks + 1 day
        var timeStamp = moment(0).add(2, 'weeks').add(1, 'days').unix();

        // add milestones
        await milestones.addMilestone("TEST_1", timeStamp.toString(), "0x5", 0);

        var rv = await milestones.verifyObjectives.call(1, "0x0");
        assert.equal(rv, false, "return value should be false");
    });
});
