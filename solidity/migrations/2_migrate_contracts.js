var SafeMath = artifacts.require("./SafeMath.sol");
var Milestones = artifacts.require("./Milestones.sol");
var ProjectMeta = artifacts.require("./ProjectMeta.sol");

module.exports = function(deployer) {
    deployer.deploy(SafeMath);
    deployer.link(SafeMath, Milestones);
    deployer.deploy(ProjectMeta);
};
